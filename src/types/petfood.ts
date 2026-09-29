/** 寵物食品資料原始記錄（MOA TransService UnitId=wxV177kLhEE3） */
export interface RawFoodRecord {
  ID: string;
  fname: string;
  fitem: string;
  fsource: string;
  fwcn: string;
  fmat: string;
  fnut: string;
  fusage1: string;
  fusage2: string;
  fusage3: string;
  forigin: string;
  flegalname: string;
}

/** 寵物食品業者資料原始記錄（MOA TransService UnitId=6GNl6qsdx4nx） */
export interface RawVendorRecord {
  ID: string;
  legaltype: string;
  legalname: string;
  ownname: string;
  legaltel: string;
  legaladdress: string;
  contactname: string;
  legalcountry: string;
  legalgzone: string;
}

export type PetKind = '犬' | '貓' | '其他';

export interface PetFood {
  id: string;
  name: string;
  item: string;
  source: string;
  packageSpec: string;
  materials: string;
  nutrients: string;
  usagePets: string;
  usageMethod: string;
  storageMethod: string;
  origin: string;
  vendorRaw: string;
  vendorName: string;
  vendorRegistered: boolean;
  pets: PetKind[];
}

export interface VendorDetail {
  id: string;
  type: string;
  typeLabel: string;
  name: string;
  owner: string;
  tel: string;
  address: string;
  contact: string;
  country: string;
  zone: string;
}

export interface FoodSummary {
  id: string;
  name: string;
  item: string;
  source: string;
  origin: string;
  pets: PetKind[];
  usagePets: string;
  vendorName: string;
  vendorRegistered: boolean;
}

export interface VendorFoodEntry {
  vendor: VendorDetail;
  foods: FoodSummary[];
}

export interface VendorSummary {
  name: string;
  typeLabel: string;
  country: string;
  zone: string;
  foodCount: number;
}

export interface FoodShard {
  [id: string]: PetFood;
}

export interface VendorShard {
  [name: string]: VendorFoodEntry;
}

export interface Meta {
  fetchedAt: string;
  normalizedAt: string;
  foodRecords: number;
  vendorRecords: number;
  matchedVendorNames: number;
  unmatchedVendorNames: number;
}
