-- Exports the demo catalogue as JSON for the database-free demo mode.
-- Run after loading migrations + demo seed (see scripts/demo/export-demo-catalog.sh).
select jsonb_pretty(jsonb_build_object(
  'generated_from', 'supabase/demo/demo_seed.sql',
  'settings', (select jsonb_object_agg(key, value) from platform_settings where key like 'fees.%' or key like 'public.%' or key like 'booking.%'),
  'locations', (select jsonb_agg(to_jsonb(l) - 'created_at' - 'updated_at' order by l.sort_order) from locations l),
  'properties', (select jsonb_agg(jsonb_build_object(
      'id', p.id, 'slug', p.slug, 'title', p.title, 'description', p.description, 'category', p.category, 'space_type', p.space_type,
      'area', p.area, 'city', p.city, 'province', p.province, 'latitude', p.latitude, 'longitude', p.longitude,
      'check_in_time', p.check_in_time, 'check_out_time', p.check_out_time, 'smoking_allowed', p.smoking_allowed,
      'pets_allowed', p.pets_allowed, 'parties_allowed', p.parties_allowed, 'children_allowed', p.children_allowed,
      'infants_allowed', p.infants_allowed, 'id_required', p.id_required, 'house_rules', p.house_rules, 'currency', p.currency,
      'cancellation_policy', p.cancellation_policy, 'booking_mode', p.booking_mode, 'rating_avg', p.rating_avg,
      'rating_count', p.rating_count, 'is_demo', p.is_demo, 'is_featured', p.is_featured, 'host_id', p.host_id,
      'approved_at', p.approved_at,
      'host_verified', coalesce(hp.verification_status = 'APPROVED', false),
      'location', (select jsonb_build_object('slug', l.slug, 'name', l.name) from locations l where l.id = p.location_id),
      'listings', (select jsonb_agg(to_jsonb(li) - 'created_at' - 'updated_at' - 'deleted_at' - 'property_id' order by li.sort_order) from listings li where li.property_id = p.id),
      'property_photos', (select jsonb_agg(jsonb_build_object('id', ph.id, 'url', ph.url, 'alt', ph.alt, 'sort_order', ph.sort_order, 'is_cover', ph.is_cover) order by ph.sort_order) from property_photos ph where ph.property_id = p.id),
      'listing_amenities', (select coalesce(jsonb_agg(jsonb_build_object('listing_id', la.listing_id, 'amenities', jsonb_build_object('code', a.code, 'name', a.name, 'name_ur', a.name_ur, 'icon', a.icon, 'grp', a.grp)) order by a.sort_order), '[]') from listing_amenities la join amenities a on a.id = la.amenity_id where la.property_id = p.id),
      'reviews', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'overall', r.overall, 'cleanliness', r.cleanliness, 'accuracy', r.accuracy, 'location', r.location,
          'communication', r.communication, 'value', r.value, 'body', r.body, 'host_response', r.host_response, 'is_demo', r.is_demo,
          'demo_author_name', r.demo_author_name, 'created_at', r.created_at) order by r.created_at desc), '[]') from reviews r where r.property_id = p.id and r.status = 'PUBLISHED')
    ) order by p.slug)
    from properties p left join host_profiles hp on hp.id = p.host_id
    where p.status = 'APPROVED' and p.deleted_at is null and p.is_demo),
  'hosts', (select jsonb_object_agg(hp.id, jsonb_build_object('id', hp.id, 'display_name', hp.display_name, 'about', hp.about, 'languages', hp.languages,
      'response_time_hours', hp.response_time_hours, 'is_verified', hp.verification_status = 'APPROVED', 'hosting_since', pr.created_at, 'avatar_url', pr.avatar_url))
    from host_profiles hp join profiles pr on pr.id = hp.id where pr.email like '%@demo.stayzone.invalid')
));
