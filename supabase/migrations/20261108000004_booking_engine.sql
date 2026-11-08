-- =====================================================================
-- StayZone — 0004 Booking engine & search (server-side, transactional)
-- All prices are computed HERE, never trusted from the browser.
-- Stay dates are calendar dates; "today" = Asia/Karachi local date.
-- =====================================================================

create or replace function public.pk_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Karachi')::date $$;

-- Live statuses that hold inventory (must match bookings_no_overlap).
create or replace function public.booking_holds_inventory(s public.booking_status) returns boolean
language sql immutable as $$
  select s in ('PENDING','AWAITING_PAYMENT','CONFIRMED','CHECKED_IN','DISPUTED')
$$;

-- Release inventory held by expired holds. Safe to call often (cron / before booking).
create or replace function public.expire_stale_bookings(p_listing uuid default null) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with x as (
    update public.bookings set status = 'EXPIRED', hold_expires_at = null
    where status in ('PENDING','AWAITING_PAYMENT')
      and hold_expires_at is not null and hold_expires_at < now()
      and (p_listing is null or listing_id = p_listing)
    returning id, guest_id
  ), n1 as (
    insert into public.notifications (user_id, type, title, body, link)
    select guest_id, 'BOOKING_EXPIRED', 'Reservation hold expired',
           'Your reservation was not completed in time and the dates have been released.',
           '/account/bookings/' || id
    from x returning 1
  )
  select count(*) into n from x;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- quote_booking: full server-side price calculation. Raises on any
-- invalid input. Returns a jsonb snapshot stored on the booking.
-- ---------------------------------------------------------------------
create or replace function public.quote_booking(
  p_listing uuid, p_check_in date, p_check_out date,
  p_adults int, p_children int default 0, p_infants int default 0
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  l public.listings%rowtype;
  p public.properties%rowtype;
  d date;
  night_price bigint;
  rule record;
  nightly jsonb := '[]'::jsonb;
  accommodation bigint := 0;
  discount_bps int := 0;
  discount bigint := 0;
  extra_guests int;
  extra_fee bigint := 0;
  subtotal bigint;
  guest_fee_bps int := public.setting_int('fees.guest_service_bps', 400);
  commission_bps int := public.setting_int('fees.host_commission_bps', 800);
  tax_bps int := public.setting_int('fees.tax_bps', 0);
  guest_fee bigint; commission bigint; tax bigint; total bigint;
  nights int;
  min_n int; max_n int;
  rule_min int;
begin
  if p_check_in is null or p_check_out is null then
    raise exception 'DATES_REQUIRED' using errcode = '22023';
  end if;
  if p_check_out <= p_check_in then
    raise exception 'CHECKOUT_BEFORE_CHECKIN' using errcode = '22023';
  end if;
  if p_check_in < public.pk_today() then
    raise exception 'CHECKIN_IN_PAST' using errcode = '22023';
  end if;
  if p_check_in > public.pk_today() + public.setting_int('booking.max_advance_days', 540) then
    raise exception 'CHECKIN_TOO_FAR' using errcode = '22023';
  end if;
  if coalesce(p_adults,0) < 1 or coalesce(p_children,0) < 0 or coalesce(p_infants,0) < 0 then
    raise exception 'INVALID_GUESTS' using errcode = '22023';
  end if;

  select * into l from public.listings where id = p_listing and deleted_at is null and is_active;
  if not found then raise exception 'LISTING_NOT_FOUND' using errcode = 'P0002'; end if;
  select * into p from public.properties where id = l.property_id and deleted_at is null and status = 'APPROVED';
  if not found then raise exception 'PROPERTY_NOT_BOOKABLE' using errcode = 'P0002'; end if;

  if p_adults + p_children > l.max_guests then
    raise exception 'TOO_MANY_GUESTS' using errcode = '22023';
  end if;
  if p_children > 0 and not p.children_allowed then raise exception 'CHILDREN_NOT_ALLOWED' using errcode = '22023'; end if;
  if p_infants > 0 and not p.infants_allowed then raise exception 'INFANTS_NOT_ALLOWED' using errcode = '22023'; end if;

  nights := p_check_out - p_check_in;
  select max(r.min_nights) into rule_min from public.pricing_rules r
   where r.listing_id = l.id and r.span && daterange(p_check_in, p_check_out, '[)') and r.min_nights is not null;
  min_n := greatest(l.min_nights, coalesce(rule_min, 1));
  max_n := l.max_nights;
  if nights < min_n then raise exception 'MIN_NIGHTS:%', min_n using errcode = '22023'; end if;
  if nights > max_n then raise exception 'MAX_NIGHTS:%', max_n using errcode = '22023'; end if;

  d := p_check_in;
  while d < p_check_out loop
    -- Friday & Saturday nights use weekend price when set.
    night_price := case when extract(isodow from d) in (5,6) and l.weekend_price_minor is not null
                        then l.weekend_price_minor else l.nightly_price_minor end;
    select r.nightly_price_minor, r.adjustment_bps into rule
      from public.pricing_rules r
     where r.listing_id = l.id and r.span @> d
     order by r.priority desc, r.created_at desc limit 1;
    if found then
      if rule.nightly_price_minor is not null then
        night_price := rule.nightly_price_minor;
      else
        night_price := round(night_price * (10000 + rule.adjustment_bps) / 10000.0)::bigint;
      end if;
    end if;
    nightly := nightly || jsonb_build_object('date', d, 'price_minor', night_price);
    accommodation := accommodation + night_price;
    d := d + 1;
  end loop;

  discount_bps := case when nights >= 28 then l.monthly_discount_bps
                       when nights >= 7 then l.weekly_discount_bps else 0 end;
  discount := round(accommodation * discount_bps / 10000.0)::bigint;
  extra_guests := greatest(0, p_adults + p_children - l.base_guests);
  extra_fee := extra_guests * l.extra_guest_fee_minor * nights;
  subtotal := accommodation - discount + l.cleaning_fee_minor + extra_fee;
  guest_fee := round(subtotal * guest_fee_bps / 10000.0)::bigint;
  commission := round(subtotal * commission_bps / 10000.0)::bigint;
  tax := round((subtotal + guest_fee) * tax_bps / 10000.0)::bigint;
  total := subtotal + guest_fee + tax;

  return jsonb_build_object(
    'listing_id', l.id, 'property_id', p.id, 'host_id', p.host_id,
    'currency', p.currency, 'check_in', p_check_in, 'check_out', p_check_out, 'nights', nights,
    'adults', p_adults, 'children', p_children, 'infants', p_infants,
    'nightly', nightly,
    'accommodation_minor', accommodation,
    'discount_bps', discount_bps, 'discount_minor', discount,
    'cleaning_fee_minor', l.cleaning_fee_minor,
    'extra_guests', extra_guests, 'extra_guest_fee_minor', extra_fee,
    'subtotal_minor', subtotal,
    'guest_fee_bps', guest_fee_bps, 'guest_fee_minor', guest_fee,
    'tax_bps', tax_bps, 'tax_minor', tax,
    'total_minor', total,
    'host_commission_bps', commission_bps, 'host_commission_minor', commission,
    'host_payout_minor', subtotal - commission,
    'security_deposit_minor', l.security_deposit_minor,
    'booking_mode', p.booking_mode, 'cancellation_policy', p.cancellation_policy
  );
end $$;

-- Is a specific unit free for [check_in, check_out)?
create or replace function public.listing_is_available(p_listing uuid, p_check_in date, p_check_out date)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.bookings b
     where b.listing_id = p_listing and public.booking_holds_inventory(b.status)
       and b.stay && daterange(p_check_in, p_check_out, '[)')
       and not (b.status in ('PENDING','AWAITING_PAYMENT') and b.hold_expires_at is not null and b.hold_expires_at < now())
  ) and not exists (
    select 1 from public.availability_blocks a
     where a.listing_id = p_listing and a.span && daterange(p_check_in, p_check_out, '[)')
  );
$$;

-- ---------------------------------------------------------------------
-- create_booking: atomically reserve ONE free unit in a unit group.
-- Concurrency: listing rows are locked FOR UPDATE, and the
-- bookings_no_overlap exclusion constraint is the final guarantee.
-- ---------------------------------------------------------------------
create or replace function public.create_booking(
  p_property uuid, p_unit_group text, p_check_in date, p_check_out date,
  p_adults int, p_children int default 0, p_infants int default 0,
  p_message text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  prop public.properties%rowtype;
  cand record;
  q jsonb;
  new_id uuid; new_code text;
  st public.booking_status;
  hold_until timestamptz;
  last_err text := 'DATES_UNAVAILABLE';
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.is_active_user(uid) then raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501'; end if;
  if not exists (select 1 from auth.users u where u.id = uid and u.email_confirmed_at is not null) then
    raise exception 'EMAIL_NOT_VERIFIED' using errcode = '42501';
  end if;

  select * into prop from public.properties where id = p_property and status = 'APPROVED' and deleted_at is null;
  if not found then raise exception 'PROPERTY_NOT_BOOKABLE' using errcode = 'P0002'; end if;
  if prop.is_demo and not coalesce((select (value #>> '{}')::boolean from public.platform_settings where key = 'demo.allow_bookings'), false) then
    raise exception 'DEMO_LISTING' using errcode = '42501';
  end if;
  if prop.host_id = uid then raise exception 'CANNOT_BOOK_OWN_PROPERTY' using errcode = '42501'; end if;

  -- Limit unpaid holds per guest (abuse protection)
  if (select count(*) from public.bookings where guest_id = uid and status in ('PENDING','AWAITING_PAYMENT')
        and (hold_expires_at is null or hold_expires_at > now())) >= public.setting_int('booking.max_open_holds', 3) then
    raise exception 'TOO_MANY_OPEN_HOLDS' using errcode = '42501';
  end if;

  for cand in
    select l.id from public.listings l
     where l.property_id = prop.id and l.unit_group = coalesce(p_unit_group, 'default')
       and l.is_active and l.deleted_at is null
     order by l.sort_order, l.id
     for update
  loop
    perform public.expire_stale_bookings(cand.id);
    if not public.listing_is_available(cand.id, p_check_in, p_check_out) then
      continue;
    end if;
    q := public.quote_booking(cand.id, p_check_in, p_check_out, p_adults, coalesce(p_children,0), coalesce(p_infants,0));

    if prop.booking_mode = 'INSTANT' then
      st := 'AWAITING_PAYMENT';
      hold_until := now() + make_interval(mins => public.setting_int('booking.payment_hold_minutes', 20));
    else
      st := 'PENDING';
      hold_until := now() + make_interval(hours => public.setting_int('booking.request_response_hours', 24));
    end if;

    begin
      insert into public.bookings (
        property_id, listing_id, guest_id, host_id, check_in, check_out,
        adults, children, infants, booking_mode, status, hold_expires_at, guest_message,
        currency, accommodation_minor, discount_minor, cleaning_fee_minor, extra_guest_fee_minor,
        guest_fee_minor, tax_minor, total_minor, host_commission_minor, host_payout_minor,
        guest_fee_bps, host_commission_bps, tax_bps, price_breakdown, cancellation_policy)
      values (
        prop.id, cand.id, uid, prop.host_id, p_check_in, p_check_out,
        p_adults, coalesce(p_children,0), coalesce(p_infants,0), prop.booking_mode, st, hold_until,
        nullif(left(trim(p_message), 2000), ''),
        q->>'currency', (q->>'accommodation_minor')::bigint, (q->>'discount_minor')::bigint,
        (q->>'cleaning_fee_minor')::bigint, (q->>'extra_guest_fee_minor')::bigint,
        (q->>'guest_fee_minor')::bigint, (q->>'tax_minor')::bigint, (q->>'total_minor')::bigint,
        (q->>'host_commission_minor')::bigint, (q->>'host_payout_minor')::bigint,
        (q->>'guest_fee_bps')::int, (q->>'host_commission_bps')::int, (q->>'tax_bps')::int,
        q, prop.cancellation_policy)
      returning id, code into new_id, new_code;
    exception when exclusion_violation then
      last_err := 'DATES_UNAVAILABLE';
      continue;  -- another request won this unit; try the next one
    end;

    insert into public.notifications (user_id, type, title, body, link) values
      (prop.host_id,
       case when st = 'PENDING' then 'BOOKING_REQUEST' else 'BOOKING_STARTED' end,
       case when st = 'PENDING' then 'New booking request' else 'New reservation in progress' end,
       prop.title || ' · ' || to_char(p_check_in, 'DD Mon') || ' – ' || to_char(p_check_out, 'DD Mon YYYY'),
       '/host/bookings');
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, after)
      values (uid, 'booking.create', 'booking', new_id::text, jsonb_build_object('status', st, 'total_minor', q->'total_minor'));

    return jsonb_build_object('id', new_id, 'code', new_code, 'status', st, 'hold_expires_at', hold_until, 'quote', q);
  end loop;

  raise exception '%', last_err using errcode = 'P0001';
end $$;

-- Host accepts or rejects a request-to-book.
create or replace function public.host_respond_booking(p_booking uuid, p_accept boolean, p_reason text default null)
returns public.booking_status
language plpgsql security definer set search_path = public as $$
declare b public.bookings%rowtype; uid uuid := auth.uid(); new_st public.booking_status;
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found or (b.host_id <> uid and not public.is_admin()) then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if b.status <> 'PENDING' or (b.hold_expires_at is not null and b.hold_expires_at < now()) then
    raise exception 'NOT_PENDING' using errcode = '22023';
  end if;
  if p_accept then
    new_st := 'AWAITING_PAYMENT';
    update public.bookings set status = new_st,
      hold_expires_at = now() + make_interval(hours => public.setting_int('booking.accepted_payment_hours', 12))
     where id = b.id;
  else
    new_st := 'REJECTED';
    update public.bookings set status = new_st, hold_expires_at = null,
      cancellation_reason = nullif(left(trim(p_reason), 500), ''), cancelled_by = uid, cancelled_at = now()
     where id = b.id;
  end if;
  insert into public.notifications (user_id, type, title, body, link) values (
    b.guest_id,
    case when p_accept then 'BOOKING_ACCEPTED' else 'BOOKING_REJECTED' end,
    case when p_accept then 'Your request was accepted — complete payment' else 'Your booking request was declined' end,
    null, '/account/bookings/' || b.id);
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (uid, 'booking.host_respond', 'booking', b.id::text,
            jsonb_build_object('status', b.status), jsonb_build_object('status', new_st));
  return new_st;
end $$;

-- Cancellation before payment (unpaid holds/requests). Paid cancellations
-- with refunds are handled by the payments module (Phase 5).
create or replace function public.cancel_unpaid_booking(p_booking uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings%rowtype; uid uuid := auth.uid();
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found or (b.guest_id <> uid and b.host_id <> uid and not public.is_admin()) then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if b.status not in ('PENDING','AWAITING_PAYMENT') then
    raise exception 'NOT_CANCELLABLE_HERE' using errcode = '22023';
  end if;
  if exists (select 1 from public.payments where booking_id = b.id and status = 'PAID') then
    raise exception 'PAID_USE_REFUND_FLOW' using errcode = '22023';
  end if;
  update public.bookings set status = 'CANCELLED', hold_expires_at = null, cancelled_at = now(),
    cancelled_by = uid, cancellation_reason = nullif(left(trim(p_reason), 500), '')
   where id = b.id;
  insert into public.notifications (user_id, type, title, link)
  values (case when uid = b.guest_id then b.host_id else b.guest_id end, 'BOOKING_CANCELLED',
          'A booking was cancelled', case when uid = b.guest_id then '/host/bookings' else '/account/bookings/' || b.id end);
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (uid, 'booking.cancel_unpaid', 'booking', b.id::text,
            jsonb_build_object('status', b.status), jsonb_build_object('status', 'CANCELLED'));
end $$;

-- ---------------------------------------------------------------------
-- search_properties: public search over APPROVED properties only.
-- Availability is respected when dates are given.
-- ---------------------------------------------------------------------
create or replace function public.search_properties(
  p_query text default null,
  p_location_slug text default null,
  p_check_in date default null,
  p_check_out date default null,
  p_guests int default 1,
  p_categories public.property_category[] default null,
  p_space_types public.space_type[] default null,
  p_min_price bigint default null,
  p_max_price bigint default null,
  p_bedrooms int default null,
  p_bathrooms numeric default null,
  p_amenities text[] default null,
  p_instant_only boolean default false,
  p_verified_only boolean default false,
  p_min_rating numeric default null,
  p_include_demo boolean default false,
  p_sort text default 'recommended',
  p_limit int default 24,
  p_offset int default 0
) returns table (
  id uuid, slug text, title text, category public.property_category, space_type public.space_type,
  city text, province text, area text, location_slug text, latitude numeric, longitude numeric,
  cover_url text, price_from_minor bigint, currency char(3), max_guests int, bedrooms int, bathrooms numeric,
  rating_avg numeric, rating_count int, booking_mode public.booking_mode, host_verified boolean,
  is_demo boolean, is_featured boolean, total_count bigint
)
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  has_dates boolean := p_check_in is not null and p_check_out is not null and p_check_out > p_check_in;
  q text := nullif(trim(p_query), '');
begin
  if p_limit > 60 then p_limit := 60; end if;
  if p_limit < 1 then p_limit := 1; end if;
  if p_offset < 0 then p_offset := 0; end if;

  return query
  with eligible as (
    select l.property_id, min(l.nightly_price_minor) as price_from, max(l.max_guests) as max_g,
           max(l.bedrooms) as beds, max(l.bathrooms) as baths
      from public.listings l
     where l.is_active and l.deleted_at is null
       and l.max_guests >= greatest(coalesce(p_guests,1),1)
       and (not has_dates or (
              (p_check_out - p_check_in) between l.min_nights and l.max_nights
              and public.listing_is_available(l.id, p_check_in, p_check_out)))
     group by l.property_id
  ), base as (
    select p.*, e.price_from, e.max_g, e.beds, e.baths, loc.slug as loc_slug,
           coalesce(hp.verification_status = 'APPROVED', false) as h_verified
      from public.properties p
      join eligible e on e.property_id = p.id
      left join public.locations loc on loc.id = p.location_id
      left join public.host_profiles hp on hp.id = p.host_id
      join public.profiles hostp on hostp.id = p.host_id and not hostp.is_suspended
     where p.status = 'APPROVED' and p.deleted_at is null
       and (p_include_demo or not p.is_demo)
       and (p_location_slug is null or loc.slug = p_location_slug)
       and (q is null or p.city ilike '%' || q || '%' or p.title ilike '%' || q || '%'
            or p.area ilike '%' || q || '%' or p.province ilike '%' || q || '%'
            or loc.name ilike '%' || q || '%')
       and (p_categories is null or p.category = any(p_categories))
       and (p_space_types is null or p.space_type = any(p_space_types))
       and (p_min_price is null or e.price_from >= p_min_price)
       and (p_max_price is null or e.price_from <= p_max_price)
       and (p_bedrooms is null or e.beds >= p_bedrooms)
       and (p_bathrooms is null or e.baths >= p_bathrooms)
       and (not p_instant_only or p.booking_mode = 'INSTANT')
       and (not p_verified_only or coalesce(hp.verification_status = 'APPROVED', false))
       and (p_min_rating is null or p.rating_avg >= p_min_rating)
       and (p_amenities is null or cardinality(p_amenities) = 0 or (
             select count(distinct a.code) from public.listing_amenities la
               join public.amenities a on a.id = la.amenity_id
              where la.property_id = p.id and a.code = any(p_amenities)) = cardinality(p_amenities))
  )
  select b.id, b.slug, b.title, b.category, b.space_type, b.city, b.province, b.area, b.loc_slug,
         b.latitude, b.longitude,
         (select ph.url from public.property_photos ph where ph.property_id = b.id
           order by ph.is_cover desc, ph.sort_order limit 1),
         b.price_from, b.currency, b.max_g, b.beds, b.baths, b.rating_avg, b.rating_count,
         b.booking_mode, b.h_verified, b.is_demo, b.is_featured,
         count(*) over ()
    from base b
   order by
     case when p_sort = 'price_asc' then b.price_from end asc nulls last,
     case when p_sort = 'price_desc' then b.price_from end desc nulls last,
     case when p_sort = 'rating' then b.rating_avg end desc nulls last,
     case when p_sort = 'reviews' then b.rating_count end desc nulls last,
     -- recommended: featured, verified, rating weighted by volume
     case when p_sort not in ('price_asc','price_desc','rating','reviews') then
       (b.is_featured::int * 2 + b.h_verified::int + b.rating_avg * least(b.rating_count, 20) / 20.0) end desc nulls last,
     b.approved_at desc nulls last, b.id
   limit p_limit offset p_offset;
end $$;

-- Grants: only these RPCs are callable by clients.
revoke all on function public.expire_stale_bookings(uuid) from public, anon, authenticated;
revoke all on function public.create_booking(uuid, text, date, date, int, int, int, text) from public, anon;
revoke all on function public.host_respond_booking(uuid, boolean, text) from public, anon;
revoke all on function public.cancel_unpaid_booking(uuid, text) from public, anon;
grant execute on function public.create_booking(uuid, text, date, date, int, int, int, text) to authenticated;
grant execute on function public.host_respond_booking(uuid, boolean, text) to authenticated;
grant execute on function public.cancel_unpaid_booking(uuid, text) to authenticated;
grant execute on function public.quote_booking(uuid, date, date, int, int, int) to anon, authenticated;
grant execute on function public.search_properties(text, text, date, date, int, public.property_category[], public.space_type[], bigint, bigint, int, numeric, text[], boolean, boolean, numeric, boolean, text, int, int) to anon, authenticated;
grant execute on function public.expire_stale_bookings(uuid) to service_role;
grant execute on function public.listing_is_available(uuid, date, date) to anon, authenticated;
