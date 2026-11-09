#!/usr/bin/env python3
"""
Generates supabase/demo/demo_seed.sql — DEMO data for presentations only.

Every demo row is clearly flagged:
  * properties.is_demo = true  (shown with a "Demo listing" badge in the UI)
  * demo users use the reserved domain  @demo.stayzone.invalid  and cannot log in
  * reviews.is_demo = true

Remove everything with supabase/demo/demo_remove.sql.
Photos are free-licence Unsplash images used for illustration — they are
NOT photos of the actual (fictional) properties.

Run:  python3 scripts/demo/generate_demo_seed.py
"""
import uuid, pathlib, datetime, random

random.seed(42)
NS = uuid.UUID("7b1f6c1e-0d6a-4a52-9a43-5a7e3c2f9d10")
def uid(*parts): return str(uuid.uuid5(NS, "/".join(map(str, parts))))
def q(s): return "null" if s is None else "'" + str(s).replace("'", "''") + "'"
def img(pid): return f"https://images.unsplash.com/photo-{pid}?auto=format&fit=crop&w=1600&q=80"

APT = ["1522708323590-d24dbb6b0267","1502672260266-1c1ef2d93688","1560448204-e02f11c3d0e2","1484154218962-a197022b5858",
       "1583847268964-b28dc8f51f92","1564078516393-cf04bd966897","1586023492125-27b2c045efd7","1628592102751-ba83b0314276",
       "1613575831056-0acd5da8f085"]
BED = ["1512918728675-ed5a9ecdebfd","1618773928121-c32242e63f39","1611892440504-42a792e24d32","1629140727571-9b5c6f6267b4",
       "1631049307264-da0ec9d70304","1631049552057-403cdb8f0658","1578683010236-d716f9a3f461"]
VILLA = ["1613977257365-aaae5a9817ff","1613490493576-7fde63acd811","1596178067639-5c6e68aea6dc","1582610116397-edb318620f90",
         "1593987314040-8e0ac84ae724","1521783593447-5702b9bfd267","1416331108676-a22ccb276e35"]
FARM = ["1723119249825-5c44f3b8871f","1761013320045-d29e4f10bcbc","1759967482850-8a1d83eaae61","1782852557452-27fe2e6996fa"]
CABIN = ["1570793005386-840846445fed","1475087542963-13ab5e611954","1551648746-d158bcd704e7","1609349093648-51d2ceb5a72a",
         "1506974210756-8e1b8985d348","1605272058466-5988743ff1db","1610195771759-7926c38df364","1628620801061-51e05d0ad917",
         "1598274560998-f5b91d19d1f1","1601996202505-483153cf4c11"]
HOTEL = ["1621293954908-907159247fc8","1551882547-ff40c63fe5fa"]
HOSTEL = ["1555854877-bab0e564b8d5","1709805619372-40de3f158e83"]
VIEW = {
  "hunza": ["1514558427911-8e293bebf18c","1579196900052-a6034632c042","1592298483937-d76c1a24dbca","1638433100361-a385449453a2"],
  "skardu": ["1602147557719-1d65f9e58a24","1679951124125-50cc4029d727","1784223011681-30a45846cd6f"],
  "swat": ["1624087267589-41ea77e28b1a","1649279585660-b29ab13b93a8","1714395009352-9aadc86a69bd"],
  "lahore": ["1603491656337-3b491147917c"], "islamabad": ["1608020932658-d0e19a69580b"],
  "karachi": ["1642709441467-6816f4dec4af","1759323050124-eb669cec0b72"],
}

HOSTS = [
  ("ayesha", "Ayesha Khan", "Ayesha's Stays", "PROPERTY_MANAGER", "Lahore-based host managing family-friendly city stays. I love recommending the best food streets!", True),
  ("karim", "Karim Baig", "Baig Hospitality", "HOTEL", "Born and raised in Hunza. Our family has welcomed travellers to the valley for two generations.", True),
  ("sana", "Sana Malik", None, "INDIVIDUAL", "Islamabad architect who restores homes in the hills. Quiet, clean and well-equipped spaces.", True),
  ("usman", "Usman Afridi", "Afridi Homes", "INDIVIDUAL", "Peshawar and Swat host. Pashtun hospitality, home-cooked breakfast and local tips.", False),
  ("zara", "Zara Hussain", "Coastline Stays", "PROPERTY_MANAGER", "Karachi stays by the sea, plus a lively backpacker hostel for solo travellers.", True),
]
GUESTS = ["Hamza R.", "Fatima S.", "Daniel M.", "Mahnoor A.", "Bilal T.", "Sophie L.", "Ali H.", "Iqra N."]

# (key, host, loc, title, category, space, area, city, province, lat, lng, mode, policy,
#  units: [(name, group, count, space, base_g, max_g, bedrooms, beds, baths, price, weekend, clean, extra, min_n)],
#  amenities, photos, description, featured)
P = [
 ("gulberg-apt","ayesha","lahore","Gulberg Designer Apartment with City Views","APARTMENT","ENTIRE_PLACE","Gulberg III","Lahore","Punjab",31.5160,74.3450,"INSTANT","MODERATE",
  [("Entire apartment","default",1,"ENTIRE_PLACE",2,4,2,2,2,18000,21000,2500,1500,1)],
  ["wifi","air_conditioning","kitchen","parking","generator","security","workspace","tv","washer"], APT[0:4]+VIEW["lahore"],
  "A bright two-bedroom apartment in the heart of Gulberg, minutes from MM Alam Road's cafés. Inverter ACs, solar-backed UPS, fast fibre Wi-Fi and a fully equipped kitchen.", True),
 ("walled-city-haveli","ayesha","lahore","Haveli-style Guest House near the Walled City","GUEST_HOUSE","PRIVATE_ROOM","Walled City","Lahore","Punjab",31.5820,74.3105,"REQUEST","FLEXIBLE",
  [("Courtyard Room","courtyard",3,"PRIVATE_ROOM",2,3,1,1,1,9500,None,0,1200,1)],
  ["wifi","air_conditioning","breakfast","security","hot_water","family_friendly"], VIEW["lahore"]+BED[1:4],
  "Stay in a restored haveli a short walk from Badshahi Mosque and the Delhi Gate food trail. Traditional breakfast on the rooftop with views of the old city.", False),
 ("dha-farmhouse","ayesha","lahore","DHA Farmhouse with Lawn & Private Pool","FARMHOUSE","ENTIRE_PLACE","Bedian Road","Lahore","Punjab",31.4300,74.4600,"REQUEST","STRICT",
  [("Entire farmhouse","default",1,"ENTIRE_PLACE",8,16,5,7,5,65000,80000,8000,2000,1)],
  ["wifi","air_conditioning","pool","parking","generator","security","garden","bbq","family_friendly","kitchen"], FARM[0:2]+VILLA[2:5],
  "A family farmhouse with a big lawn, private pool and BBQ area — perfect for get-togethers, mehndis and weekend escapes from the city.", True),
 ("f7-serviced","sana","islamabad","F-7 Serviced Apartment near Jinnah Super","SERVICED_APARTMENT","ENTIRE_PLACE","F-7","Islamabad","Islamabad Capital Territory",33.7215,73.0560,"INSTANT","MODERATE",
  [("Studio apartment","default",1,"ENTIRE_PLACE",2,2,1,1,1,14000,None,1500,0,1)],
  ["wifi","air_conditioning","heating","kitchen","parking","generator","workspace","washer"], APT[4:8]+VIEW["islamabad"],
  "Business-ready serviced studio in F-7, walking distance to Jinnah Super. Daily housekeeping, workspace and backup power.", False),
 ("margalla-villa","sana","islamabad","Margalla Hills View Villa","VILLA","ENTIRE_PLACE","E-7","Islamabad","Islamabad Capital Territory",33.7300,73.0400,"REQUEST","STRICT",
  [("Entire villa","default",1,"ENTIRE_PLACE",6,10,4,5,4,55000,62000,6000,2500,2)],
  ["wifi","air_conditioning","heating","pool","parking","generator","security","garden","family_friendly","mountain_view"], VILLA[0:2]+VILLA[4:7],
  "A contemporary four-bedroom villa facing the Margalla Hills, with a heated pool, landscaped garden and quick access to Trail 3 and Daman-e-Koh.", True),
 ("bhurban-cottage","sana","murree","Pine Cottage in Bhurban","COTTAGE","ENTIRE_PLACE","Bhurban","Murree","Punjab",33.9600,73.4500,"INSTANT","MODERATE",
  [("Entire cottage","default",1,"ENTIRE_PLACE",4,6,2,3,2,22000,27000,2500,1500,1)],
  ["wifi","heating","kitchen","parking","generator","mountain_view","family_friendly","hot_water"], CABIN[4:6]+BED[0:1]+APT[2:3],
  "A cosy cottage under the pines with a fireplace, gas heating and a balcony facing the hills. Snow in winter, cool breezes all summer.", False),
 ("nathia-cabin","sana","nathiagali","Forest Cabin on the Mukshpuri Trail","MOUNTAIN_CABIN","ENTIRE_PLACE","Dunga Gali","Nathiagali","Khyber Pakhtunkhwa",34.0700,73.3900,"REQUEST","MODERATE",
  [("Entire cabin","default",1,"ENTIRE_PLACE",2,3,1,1,1,16000,19000,1500,1500,2)],
  ["heating","kitchen","parking","mountain_view","hot_water"], CABIN[0:3]+CABIN[6:7],
  "A quiet timber cabin a short walk from the Mukshpuri trailhead. Wake up to birdsong and misty forest views.", False),
 ("karimabad-hotel","karim","hunza","Karimabad Valley View Hotel","HOTEL","PRIVATE_ROOM","Karimabad","Hunza","Gilgit-Baltistan",36.3240,74.6640,"INSTANT","MODERATE",
  [("Deluxe Valley Room","deluxe",4,"PRIVATE_ROOM",2,3,1,1,1,12000,None,0,2000,1),
   ("Family Suite","family",2,"PRIVATE_ROOM",4,5,2,3,1,20000,None,0,2000,1)],
  ["wifi","heating","breakfast","parking","generator","mountain_view","hot_water","family_friendly"], VIEW["hunza"][0:2]+HOTEL[0:1]+BED[2:4],
  "Family-run hotel below Baltit Fort with terraces facing Rakaposhi and Ultar. Apricot breakfast, local guides and airport transfers on request.", True),
 ("passu-guesthouse","karim","hunza","Passu Glacier Guest House","GUEST_HOUSE","PRIVATE_ROOM","Passu","Hunza","Gilgit-Baltistan",36.4660,74.8850,"REQUEST","FLEXIBLE",
  [("Cones View Room","default",3,"PRIVATE_ROOM",2,3,1,2,1,8000,None,0,1500,1)],
  ["wifi","heating","breakfast","parking","mountain_view","hot_water"], VIEW["hunza"][2:4]+CABIN[7:9],
  "Simple, warm rooms facing the Passu Cones, close to the suspension bridge and Batura glacier treks.", False),
 ("shangrila-resort","karim","skardu","Lakeside Resort near Shangrila","RESORT","PRIVATE_ROOM","Kachura","Skardu","Gilgit-Baltistan",35.4200,75.4600,"INSTANT","STRICT",
  [("Lake View Room","lake",5,"PRIVATE_ROOM",2,3,1,1,1,25000,29000,0,3000,1)],
  ["wifi","heating","breakfast","parking","generator","security","mountain_view","garden","hot_water"], VIEW["skardu"]+HOTEL[0:1]+BED[4:5],
  "Lakeside rooms surrounded by orchards and snow peaks, with boating, a restaurant and day trips to Upper Kachura and Shigar.", True),
 ("shigar-cabin","karim","skardu","Shigar Mountain Cabin","MOUNTAIN_CABIN","ENTIRE_PLACE","Shigar","Skardu","Gilgit-Baltistan",35.4220,75.7320,"REQUEST","MODERATE",
  [("Entire cabin","default",1,"ENTIRE_PLACE",2,4,1,2,1,15000,None,1500,1500,2)],
  ["heating","kitchen","parking","mountain_view","hot_water"], CABIN[3:4]+CABIN[8:10]+VIEW["skardu"][0:1],
  "A wooden cabin among apricot trees in Shigar valley, near the restored Shigar Fort.", False),
 ("naran-riverside","usman","naran","Riverside Cottage in Naran","COTTAGE","ENTIRE_PLACE","Naran Bazaar","Naran","Khyber Pakhtunkhwa",34.9097,73.6508,"INSTANT","MODERATE",
  [("Entire cottage","default",1,"ENTIRE_PLACE",4,6,2,3,1,13000,15000,1500,1200,1)],
  ["heating","kitchen","parking","family_friendly","mountain_view","hot_water"], CABIN[1:2]+CABIN[5:6]+BED[5:6],
  "Cottage on the Kunhar river, the perfect base for Saif-ul-Malook and Babusar Top. Open in the summer season.", False),
 ("kalam-lodge","usman","swat","Kalam River Lodge","GUEST_HOUSE","PRIVATE_ROOM","Kalam","Swat","Khyber Pakhtunkhwa",35.4900,72.5800,"REQUEST","FLEXIBLE",
  [("River Room","default",3,"PRIVATE_ROOM",2,4,1,2,1,10000,None,0,1200,1)],
  ["wifi","heating","breakfast","parking","mountain_view","hot_water","family_friendly"], VIEW["swat"]+BED[6:7],
  "A riverside lodge in Kalam with forest views, bonfire nights and day trips to Mahodand Lake.", True),
 ("malam-jabba-chalet","usman","swat","Malam Jabba Ski Chalet","ENTIRE_HOME","ENTIRE_PLACE","Malam Jabba","Swat","Khyber Pakhtunkhwa",34.8000,72.5700,"REQUEST","STRICT",
  [("Entire chalet","default",1,"ENTIRE_PLACE",6,8,3,4,2,28000,34000,3000,2000,2)],
  ["wifi","heating","kitchen","parking","generator","mountain_view","family_friendly","hot_water"], CABIN[2:4]+VIEW["swat"][2:3]+APT[0:1],
  "A three-bedroom chalet close to the Malam Jabba ski slopes and chairlift, with a fireplace lounge.", False),
 ("clifton-seaview","zara","karachi","Clifton Sea-View Apartment","APARTMENT","ENTIRE_PLACE","Clifton Block 2","Karachi","Sindh",24.8138,67.0300,"INSTANT","MODERATE",
  [("Entire apartment","default",1,"ENTIRE_PLACE",4,5,2,2,2,20000,None,0,1500,1)],
  ["wifi","air_conditioning","kitchen","parking","generator","security","pool","tv","washer"], VIEW["karachi"]+APT[6:9],
  "High-floor two-bedroom apartment with sea views, building pool and 24/7 security — minutes from Sea View beach and Do Darya.", True),
 ("pechs-hostel","zara","karachi","Backpackers Hostel PECHS","HOSTEL","SHARED_ROOM","PECHS","Karachi","Sindh",24.8700,67.0650,"INSTANT","FLEXIBLE",
  [("Bed in 6-bed dorm","dorm",6,"SHARED_ROOM",1,1,0,1,1,2500,None,0,0,1)],
  ["wifi","air_conditioning","security","hot_water","workspace"], HOSTEL+APT[1:2],
  "Clean, social hostel with lockers, a shared lounge and city tours — great for solo travellers and students.", False),
 ("hayatabad-home","usman","peshawar","Hayatabad Family Home","ENTIRE_HOME","ENTIRE_PLACE","Hayatabad Phase 3","Peshawar","Khyber Pakhtunkhwa",33.9900,71.4400,"REQUEST","MODERATE",
  [("Entire home","default",1,"ENTIRE_PLACE",6,8,3,4,3,15000,None,2000,1000,1)],
  ["wifi","air_conditioning","kitchen","parking","generator","security","family_friendly","garden"], VILLA[3:4]+APT[2:5],
  "A spacious, quiet family house in Hayatabad with a small lawn, close to Karkhano market and the motorway.", False),
 ("quetta-suite","zara","quetta","Cantonment Guest Suite","PRIVATE_ROOM","PRIVATE_ROOM","Cantonment","Quetta","Balochistan",30.1900,67.0100,"REQUEST","FLEXIBLE",
  [("Private suite","default",1,"PRIVATE_ROOM",2,2,1,1,1,7000,None,0,0,1)],
  ["wifi","heating","parking","security","hot_water"], BED[0:2]+APT[5:6],
  "A private suite with its own entrance in a quiet cantonment home, near Hanna Lake road.", False),
 ("kalash-homestay","usman","chitral","Kalash Valley Homestay","PRIVATE_ROOM","PRIVATE_ROOM","Bumburet","Chitral","Khyber Pakhtunkhwa",35.7330,71.7240,"REQUEST","FLEXIBLE",
  [("Guest room","default",2,"PRIVATE_ROOM",2,3,1,2,1,6000,None,0,1000,1)],
  ["breakfast","parking","mountain_view","hot_water","family_friendly"], CABIN[9:10]+CABIN[6:7]+BED[3:4],
  "Stay with a local family in Bumburet valley and experience Kalash culture, walnut orchards and mountain streams.", False),
 ("jutial-apartment","karim","gilgit","Jutial Riverside Apartment","APARTMENT","ENTIRE_PLACE","Jutial","Gilgit","Gilgit-Baltistan",35.9000,74.3500,"INSTANT","MODERATE",
  [("Entire apartment","default",1,"ENTIRE_PLACE",2,4,2,2,1,11000,None,1000,1000,1)],
  ["wifi","heating","kitchen","parking","generator","mountain_view"], APT[3:6]+VIEW["hunza"][1:2],
  "Modern two-bedroom apartment in Jutial with river and mountain views, a convenient stop on the Karakoram Highway.", False),
]

COMMENTS = [
 "Spotless, exactly like the photos, and the host replied within minutes.",
 "Perfect for our family trip. Kids loved the space and the views!",
 "Great location and very safe. Would definitely stay again.",
 "Warm hospitality and a delicious breakfast. Highly recommended.",
 "Good value for money. Power backup worked through load-shedding.",
 "Beautiful place, check-in was smooth and everything was ready.",
]

out = []
w = out.append
w("-- =====================================================================")
w("-- DEMO DATA — generated by scripts/demo/generate_demo_seed.py")
w("-- For presentations only. Every row is flagged is_demo / @demo.stayzone.invalid.")
w("-- Remove with supabase/demo/demo_remove.sql. Do NOT load into production.")
w("-- Photos: free-licence Unsplash images used as illustrations, not the real properties.")
w("-- =====================================================================")
w("begin;")
w("insert into public.platform_settings (key, value, description) values ('demo.enabled','true','Demo dataset is loaded') on conflict (key) do update set value = 'true';")

def user(key, name):
    u = uid("user", key)
    w(f"insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) "
      f"values ('{u}','authenticated','authenticated','{key}@demo.stayzone.invalid', null, now(), "
      f"'{{\"provider\":\"email\",\"providers\":[\"email\"],\"demo\":true}}', jsonb_build_object('full_name', {q(name)}), now() - interval '400 days', now()) on conflict (id) do nothing;")
    return u

host_ids = {}
for key, name, biz, htype, about, verified in HOSTS:
    u = user("host-" + key, name); host_ids[key] = u
    w(f"update public.profiles set is_host = true, full_name = {q(name)} where id = '{u}';")
    w(f"insert into public.host_profiles (id, display_name, about, business_name, host_type, languages, response_time_hours, verification_status, verified_at, onboarding_completed_at) "
      f"values ('{u}', {q(name.split()[0])}, {q(about)}, {q(biz)}, '{htype}', array['en','ur'], {random.choice([1,2,3])}, "
      f"'{'APPROVED' if verified else 'PENDING'}', {'now()' if verified else 'null'}, now()) on conflict (id) do nothing;")
guest_ids = [user(f"guest-{i}", n) for i, n in enumerate(GUESTS)]

for (key, host, loc, title, cat, space, area, city, prov, lat, lng, mode, policy, units, amen, photos, desc, featured) in P:
    pid = uid("prop", key)
    w(f"\n-- {title}")
    w(f"insert into public.properties (id, host_id, location_id, slug, title, description, category, space_type, status, is_demo, is_featured, "
      f"address_line, area, city, province, latitude, longitude, booking_mode, cancellation_policy, licence_status, approved_at, submitted_at, house_rules) values ("
      f"'{pid}', '{host_ids[host]}', (select id from public.locations where slug = {q(loc)}), {q('demo-' + key)}, {q(title)}, {q(desc)}, "
      f"'{cat}', '{space}', 'APPROVED', true, {str(featured).lower()}, {q('Demo address — ' + area)}, {q(area)}, {q(city)}, {q(prov)}, {lat}, {lng}, "
      f"'{mode}', '{policy}', 'NOT_REQUIRED', now() - interval '200 days', now() - interval '210 days', "
      f"{q('Please respect neighbours after 10pm. Original CNIC or passport required at check-in.')}) on conflict (id) do nothing;")
    first_listing = None
    for (uname, grp, count, uspace, bg, mg, br, beds, baths, price, wk, clean, extra, mn) in units:
        for n in range(count):
            lid = uid("listing", key, grp, n)
            first_listing = first_listing or lid
            nm = uname if count == 1 else f"{uname} {n+1}"
            w(f"insert into public.listings (id, property_id, name, unit_group, space_type, base_guests, max_guests, bedrooms, beds, bathrooms, "
              f"nightly_price_minor, weekend_price_minor, cleaning_fee_minor, extra_guest_fee_minor, security_deposit_minor, weekly_discount_bps, min_nights, sort_order) values ("
              f"'{lid}', '{pid}', {q(nm)}, {q(grp)}, '{uspace}', {bg}, {mg}, {br}, {beds}, {baths}, {price*100}, {'null' if wk is None else wk*100}, "
              f"{clean*100}, {extra*100}, 0, {random.choice([0,500,1000])}, {mn}, {n}) on conflict (id) do nothing;")
    for i, ph in enumerate(photos):
        w(f"insert into public.property_photos (id, property_id, url, alt, sort_order, is_cover) values ("
          f"'{uid('photo', key, i)}', '{pid}', {q(img(ph))}, {q(title + ' — illustrative photo')}, {i}, {str(i == 0).lower()}) on conflict (id) do nothing;")
    w(f"insert into public.listing_amenities (property_id, amenity_id) select '{pid}', id from public.amenities "
      f"where code in ({', '.join(q(a) for a in amen)}) on conflict do nothing;")
    # Past completed demo stays with demo reviews (so ratings are visible).
    price = units[0][9] * 100
    for r in range(random.randint(2, 5)):
        g = guest_ids[(r * 3 + len(key)) % len(guest_ids)]
        nights = random.randint(1, 4)
        days_ago = 20 + r * 37 + random.randint(0, 10)
        acc = price * nights; clean = units[0][11] * 100
        sub = acc + clean; gf = round(sub * 0.04); com = round(sub * 0.08)
        bid = uid("booking", key, r)
        w(f"insert into public.bookings (id, property_id, listing_id, guest_id, host_id, check_in, check_out, adults, booking_mode, status, currency, "
          f"accommodation_minor, cleaning_fee_minor, guest_fee_minor, total_minor, host_commission_minor, host_payout_minor, guest_fee_bps, host_commission_bps, "
          f"price_breakdown, cancellation_policy, confirmed_at, completed_at) values ("
          f"'{bid}', '{pid}', '{first_listing}', '{g}', '{host_ids[host]}', pk_today() - {days_ago}, pk_today() - {days_ago - nights}, 2, '{mode}', 'COMPLETED', 'PKR', "
          f"{acc}, {clean}, {gf}, {sub + gf}, {com}, {sub - com}, 400, 800, '{{\"demo\":true}}', '{policy}', now() - interval '{days_ago + 5} days', now() - interval '{days_ago - nights} days') on conflict (id) do nothing;")
        overall = random.choice([4, 5, 5, 5])
        sub_scores = [max(3, min(5, overall + random.choice([-1, 0, 0]))) for _ in range(5)]
        w(f"insert into public.reviews (id, booking_id, property_id, guest_id, host_id, overall, cleanliness, accuracy, location, communication, value, body, is_demo, demo_author_name, created_at) values ("
          f"'{uid('review', key, r)}', '{bid}', '{pid}', '{g}', '{host_ids[host]}', {overall}, {', '.join(map(str, sub_scores))}, "
          f"{q(COMMENTS[(r + len(key)) % len(COMMENTS)])}, true, {q(GUESTS[guest_ids.index(g)])}, now() - interval '{days_ago - nights - 1} days') on conflict (id) do nothing;")

# Destination hero images (real photos of these places, Unsplash licence)
DEST_PHOTOS = [("lahore", "1603491656337-3b491147917c"), ("islamabad", "1608020932658-d0e19a69580b"),
    ("rawalpindi", "1608020932658-d0e19a69580b"), ("hunza", "1514558427911-8e293bebf18c"), ("karimabad", "1579196900052-a6034632c042"),
    ("skardu", "1784223011681-30a45846cd6f"), ("swat", "1624087267589-41ea77e28b1a"), ("karachi", "1759323050124-eb669cec0b72"),
    ("murree", "1584043204475-8cc101d6c77a"), ("nathiagali", "1601225713917-dc48fd6b4990"), ("naran", "1572707582365-0ee1c8e71173"),
    ("kaghan", "1605447610363-4f4f04760114"), ("peshawar", "1690015695305-a5e0218125a8"), ("quetta", "1698071500945-90fff1cf9255"),
    ("chitral", "1584562995253-9de7c2a45982"), ("gilgit", "1654115380392-318a2409c244")]
for slug, ph in DEST_PHOTOS:
    w(f"update public.locations set hero_image_url = coalesce(hero_image_url, {q(img(ph))}) where slug = {q(slug)};")
w("commit;")

root = pathlib.Path(__file__).resolve().parents[2]
(root / "supabase/demo").mkdir(parents=True, exist_ok=True)
(root / "supabase/demo/demo_seed.sql").write_text("\n".join(out) + "\n")
(root / "supabase/demo/demo_remove.sql").write_text("""-- Removes ALL demo data (properties flagged is_demo and @demo.stayzone.invalid users).
begin;
delete from public.reviews where is_demo or property_id in (select id from public.properties where is_demo);
delete from public.notifications where user_id in (select id from auth.users where email like '%@demo.stayzone.invalid');
delete from public.bookings where property_id in (select id from public.properties where is_demo);
delete from public.properties where is_demo;   -- cascades to listings, photos, amenities
delete from auth.users where email like '%@demo.stayzone.invalid';  -- cascades to profiles/host_profiles
update public.platform_settings set value = 'false' where key = 'demo.enabled';
commit;
""")
print(f"Wrote {len(P)} demo properties, {len(HOSTS)} demo hosts, {len(GUESTS)} demo guests.")
