/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as CustomerAccountAPI from '@shopify/hydrogen/customer-account-api-types';

export type CustomerFragment = Pick<
  CustomerAccountAPI.Customer,
  'id' | 'firstName' | 'lastName'
> & {
  defaultAddress?: CustomerAccountAPI.Maybe<
    Pick<
      CustomerAccountAPI.CustomerAddress,
      | 'id'
      | 'formatted'
      | 'firstName'
      | 'lastName'
      | 'company'
      | 'address1'
      | 'address2'
      | 'territoryCode'
      | 'zoneCode'
      | 'city'
      | 'zip'
      | 'phoneNumber'
    >
  >;
  addresses: {
    nodes: Array<
      Pick<
        CustomerAccountAPI.CustomerAddress,
        | 'id'
        | 'formatted'
        | 'firstName'
        | 'lastName'
        | 'company'
        | 'address1'
        | 'address2'
        | 'territoryCode'
        | 'zoneCode'
        | 'city'
        | 'zip'
        | 'phoneNumber'
      >
    >;
  };
};

export type AddressFragment = Pick<
  CustomerAccountAPI.CustomerAddress,
  | 'id'
  | 'formatted'
  | 'firstName'
  | 'lastName'
  | 'company'
  | 'address1'
  | 'address2'
  | 'territoryCode'
  | 'zoneCode'
  | 'city'
  | 'zip'
  | 'phoneNumber'
>;

export type CustomerDetailsQueryVariables = CustomerAccountAPI.Exact<{
  language?: CustomerAccountAPI.InputMaybe<CustomerAccountAPI.LanguageCode>;
}>;

export type CustomerDetailsQuery = {
  customer: Pick<
    CustomerAccountAPI.Customer,
    'id' | 'firstName' | 'lastName'
  > & {
    defaultAddress?: CustomerAccountAPI.Maybe<
      Pick<
        CustomerAccountAPI.CustomerAddress,
        | 'id'
        | 'formatted'
        | 'firstName'
        | 'lastName'
        | 'company'
        | 'address1'
        | 'address2'
        | 'territoryCode'
        | 'zoneCode'
        | 'city'
        | 'zip'
        | 'phoneNumber'
      >
    >;
    addresses: {
      nodes: Array<
        Pick<
          CustomerAccountAPI.CustomerAddress,
          | 'id'
          | 'formatted'
          | 'firstName'
          | 'lastName'
          | 'company'
          | 'address1'
          | 'address2'
          | 'territoryCode'
          | 'zoneCode'
          | 'city'
          | 'zip'
          | 'phoneNumber'
        >
      >;
    };
  };
};

interface GeneratedQueryTypes {
  '#graphql\n  query CustomerDetails($language: LanguageCode) @inContext(language: $language) {\n    customer {\n      ...Customer\n    }\n  }\n  #graphql\n  fragment Customer on Customer {\n    id\n    firstName\n    lastName\n    defaultAddress {\n      ...Address\n    }\n    addresses(first: 6) {\n      nodes {\n        ...Address\n      }\n    }\n  }\n  fragment Address on CustomerAddress {\n    id\n    formatted\n    firstName\n    lastName\n    company\n    address1\n    address2\n    territoryCode\n    zoneCode\n    city\n    zip\n    phoneNumber\n  }\n\n': {
    return: CustomerDetailsQuery;
    variables: CustomerDetailsQueryVariables;
  };
}

interface GeneratedMutationTypes {}

declare module '@shopify/hydrogen' {
  interface CustomerAccountQueries extends GeneratedQueryTypes {}
  interface CustomerAccountMutations extends GeneratedMutationTypes {}
}
