/** Approximate elevation (metres above sea level) of each destination's main town. */
export const ELEVATION_M: Record<string, number> = {
  hunza: 2438, karimabad: 2500, skardu: 2228, gilgit: 1500, chitral: 1494, naran: 2409, kaghan: 2035,
  swat: 980, nathiagali: 2501, murree: 2291, islamabad: 540, rawalpindi: 508, peshawar: 331,
  lahore: 217, quetta: 1680, ziarat: 2449, hyderabad: 13, karachi: 8,
};

export const img = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;

/** Illustrative category photos (free-licence Unsplash). */
export const CATEGORY_TILES = [
  { cat: "APARTMENT", photo: "1522708323590-d24dbb6b0267" },
  { cat: "VILLA", photo: "1613977257365-aaae5a9817ff" },
  { cat: "FARMHOUSE", photo: "1723119249825-5c44f3b8871f" },
  { cat: "HOTEL", photo: "1621293954908-907159247fc8" },
  { cat: "GUEST_HOUSE", photo: "1611892440504-42a792e24d32" },
  { cat: "RESORT", photo: "1551882547-ff40c63fe5fa" },
  { cat: "MOUNTAIN_CABIN", photo: "1609349093648-51d2ceb5a72a" },
  { cat: "PRIVATE_ROOM", photo: "1618773928121-c32242e63f39" },
  { cat: "HOSTEL", photo: "1555854877-bab0e564b8d5" },
  { cat: "ENTIRE_HOME", photo: "1582610116397-edb318620f90", label: "Holiday homes" },
] as const;
