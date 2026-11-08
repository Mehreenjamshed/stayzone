-- =====================================================================
-- StayZone — 0007 Reference data (real, not demo): settings, amenities,
-- destinations, subscription plans, compliance defaults.
-- =====================================================================

insert into public.platform_settings (key, value, description) values
  ('fees.host_commission_bps', '800', 'Host commission in basis points (800 = 8%)'),
  ('fees.guest_service_bps',  '400', 'Guest service fee in basis points (400 = 4%)'),
  ('fees.tax_bps',            '0',   'Tax applied to guest total in basis points. Configure per legal advice.'),
  ('booking.payment_hold_minutes', '20', 'Minutes an instant booking holds dates while awaiting payment'),
  ('booking.request_response_hours', '24', 'Hours a host has to answer a booking request'),
  ('booking.accepted_payment_hours', '12', 'Hours a guest has to pay after a request is accepted'),
  ('booking.max_open_holds', '3', 'Max unpaid holds per guest'),
  ('booking.max_advance_days', '540', 'How far ahead guests can book'),
  ('reviews.window_days', '30', 'Days after checkout a guest may review'),
  ('demo.allow_bookings', 'false', 'Allow reservations against demo listings (never in production)'),
  ('public.support_email', '"support@example.com"', 'Shown on Help/Contact pages'),
  ('public.support_whatsapp', '""', 'WhatsApp number shown on Help page'),
  ('public.fx_rates', '{"USD":0.00357,"GBP":0.00278,"EUR":0.00323,"AED":0.0131,"SAR":0.0134}', 'INDICATIVE display rates (units per 1 PKR). Update regularly. Guests are always charged in PKR.')
on conflict (key) do nothing;

insert into public.amenities (code, name, name_ur, icon, grp, is_filterable, sort_order) values
  ('wifi','Wi-Fi','وائی فائی','wifi','essentials',true,10),
  ('air_conditioning','Air conditioning','ایئر کنڈیشنر','snowflake','essentials',true,20),
  ('heating','Heating','ہیٹنگ','flame','essentials',true,30),
  ('kitchen','Kitchen','کچن','cooking-pot','essentials',true,40),
  ('parking','Free parking','پارکنگ','car','essentials',true,50),
  ('generator','Generator / UPS backup','جنریٹر / یو پی ایس','zap','essentials',true,60),
  ('pool','Swimming pool','سوئمنگ پول','waves','features',true,70),
  ('breakfast','Breakfast included','ناشتہ شامل','coffee','features',true,80),
  ('security','24/7 security','سیکیورٹی','shield-check','safety',true,90),
  ('family_friendly','Family-friendly','فیملی کے لیے موزوں','users','features',true,100),
  ('pet_friendly','Pet-friendly','پالتو جانور','paw-print','features',true,110),
  ('accessible','Step-free access','رسائی','accessibility','features',true,120),
  ('workspace','Dedicated workspace','کام کی جگہ','laptop','features',false,130),
  ('washer','Washing machine','واشنگ مشین','washing-machine','essentials',false,140),
  ('tv','TV','ٹی وی','tv','features',false,150),
  ('mountain_view','Mountain view','پہاڑ کا منظر','mountain','views',false,160),
  ('garden','Garden / lawn','باغ / لان','trees','features',false,170),
  ('bbq','BBQ area','باربی کیو','flame-kindling','features',false,180),
  ('hot_water','Hot water (24/7)','گرم پانی','droplets','essentials',false,190),
  ('first_aid','First-aid kit','ابتدائی طبی امداد','cross','safety',false,200)
on conflict (code) do nothing;

insert into public.locations (slug, name, name_ur, province, latitude, longitude, intro, popular_areas, is_featured, sort_order, hero_image_url) values
  ('lahore','Lahore','لاہور','Punjab',31.5204,74.3587,'The cultural heart of Pakistan — Mughal monuments, food streets and a city that never stops celebrating.',array['Gulberg','DHA','Model Town','Johar Town','Walled City'],true,10,null),
  ('islamabad','Islamabad','اسلام آباد','Islamabad Capital Territory',33.6844,73.0479,'A green, planned capital at the foot of the Margalla Hills, with easy access to the northern areas.',array['F-6','F-7','E-7','G-11','Bahria Enclave'],true,20,null),
  ('rawalpindi','Rawalpindi','راولپنڈی','Punjab',33.5651,73.0169,'Islamabad''s lively twin city — bazaars, history and convenient airport access.',array['Saddar','Bahria Town','DHA Phase 1'],false,25,null),
  ('murree','Murree','مری','Punjab',33.9070,73.3943,'Pine-covered hill station with cool summers and snowy winters, a classic family getaway.',array['Mall Road','Bhurban','Patriata'],true,30,null),
  ('nathiagali','Nathiagali','نتھیا گلی','Khyber Pakhtunkhwa',34.0722,73.3817,'A quiet Galyat hill resort with forest trails and views toward the Himalaya.',array['Mukshpuri trail','Dunga Gali'],false,35,null),
  ('hunza','Hunza','ہنزہ','Gilgit-Baltistan',36.3167,74.6500,'Apricot orchards, ancient forts and the peaks of Rakaposhi and Ultar — Pakistan''s most-loved valley.',array['Karimabad','Altit','Passu','Gulmit'],true,40,null),
  ('karimabad','Karimabad','کریم آباد','Gilgit-Baltistan',36.3240,74.6640,'Hunza''s main town, beneath Baltit Fort, with panoramic views of the valley.',array['Baltit Fort','Eagle''s Nest'],false,45,null),
  ('skardu','Skardu','سکردو','Gilgit-Baltistan',35.2971,75.6333,'Gateway to the Karakoram — cold deserts, turquoise lakes and the base for K2 expeditions.',array['Shangrila','Upper Kachura','Shigar'],true,50,null),
  ('gilgit','Gilgit','گلگت','Gilgit-Baltistan',35.9208,74.3080,'The regional hub of Gilgit-Baltistan where the Karakoram Highway meets the Gilgit river.',array['Jutial','Danyore'],false,55,null),
  ('naran','Naran','ناران','Khyber Pakhtunkhwa',34.9097,73.6508,'Summer base for Saif-ul-Malook lake and the Kaghan valley meadows.',array['Lake Saif-ul-Malook','Lalazar','Batakundi'],true,60,null),
  ('kaghan','Kaghan','کاغان','Khyber Pakhtunkhwa',34.7794,73.5214,'A river valley of alpine meadows, waterfalls and quiet villages.',array['Shogran','Siri Paye'],false,65,null),
  ('swat','Swat','سوات','Khyber Pakhtunkhwa',35.2227,72.4258,'The "Switzerland of the East" — rivers, forests and the ski slopes of Malam Jabba.',array['Kalam','Malam Jabba','Mingora','Bahrain'],true,70,null),
  ('chitral','Chitral','چترال','Khyber Pakhtunkhwa',35.8518,71.7864,'Remote valleys beneath Tirich Mir, home to the Kalash culture and the Shandur polo festival.',array['Kalash Valleys','Garam Chashma'],false,75,null),
  ('karachi','Karachi','کراچی','Sindh',24.8607,67.0011,'Pakistan''s biggest city — beaches, business districts and the best street food by the Arabian Sea.',array['Clifton','DHA','Gulshan-e-Iqbal','PECHS'],true,80,null),
  ('hyderabad','Hyderabad','حیدرآباد','Sindh',25.3960,68.3578,'Historic Sindhi city on the Indus, known for bangles and its Pakka Qila.',array['Latifabad','Qasimabad'],false,85,null),
  ('peshawar','Peshawar','پشاور','Khyber Pakhtunkhwa',34.0151,71.5249,'One of South Asia''s oldest cities — Qissa Khwani bazaar, Pashtun hospitality and legendary food.',array['University Town','Hayatabad','Old City'],true,90,null),
  ('quetta','Quetta','کوئٹہ','Balochistan',30.1798,66.9750,'The fruit garden of Pakistan, ringed by mountains and close to Hanna Lake.',array['Cantonment','Jinnah Town'],true,95,null),
  ('ziarat','Ziarat','زیارت','Balochistan',30.3816,67.7266,'A juniper-forest hill station, home to the Quaid-e-Azam Residency.',array['Quaid''s Residency','Prospect Point'],false,100,null)
on conflict (slug) do nothing;

insert into public.subscription_plans (code, name, description, monthly_price_minor, annual_price_minor, listing_allowance, trial_days, features, sort_order) values
  ('FREE_HOST','Free Host','Everything you need to start hosting.',0,0,2,0,
   '{"analytics":"basic","priority_support":false,"promo_credits_minor":0,"booking_reports":false,"multi_property":false}',10),
  ('HOST_PRO','Host Pro','For serious hosts and property managers.',299900,2999000,50,14,
   '{"analytics":"advanced","priority_support":true,"promo_credits_minor":100000,"booking_reports":true,"multi_property":true}',20)
on conflict (code) do nothing;

insert into public.compliance_requirements (province, category, kind, is_required, description) values
  ('*', null, 'IDENTITY', true, 'Host CNIC (or passport for non-residents)'),
  ('*', null, 'OWNERSHIP', true, 'Proof of ownership, tenancy permission, or written authorisation from the owner'),
  ('*', 'HOTEL', 'PROPERTY_LICENCE', true, 'Tourism department hotel registration/licence'),
  ('*', 'RESORT', 'PROPERTY_LICENCE', true, 'Tourism department registration/licence'),
  ('*', 'GUEST_HOUSE', 'PROPERTY_LICENCE', true, 'Guest house registration where required by the province'),
  ('*', 'HOSTEL', 'BUSINESS_REGISTRATION', false, 'Business registration (if operating as a company)');
