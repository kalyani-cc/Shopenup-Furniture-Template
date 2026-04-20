/** Subset of Shopenup store customer fields used by Sofa_New. */
export type StoreCustomer = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
};
