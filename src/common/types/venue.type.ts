type SortField =
  | 'name'
  | 'pricePerEvent'
  | 'rating'
  | 'availability'
  | 'category';
type SortOrder = 'ASC' | 'DESC';
type ContactPerson = {
  name: string;
  email: string;
  mobile: string;
};

export { SortField, SortOrder, ContactPerson };
