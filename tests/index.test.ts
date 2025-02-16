// File generated from our OpenAPI spec by Stainless.

import Lithic from '../index';

describe('instantiate client', () => {
  const env = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...env };

    console.warn = jest.fn();
  });

  afterEach(() => {
    process.env = env;
  });

  test('with minimal arguments', () => {
    // set API Key via env var
    process.env['LITHIC_API_KEY'] = 'env var api key';
    const client = new Lithic();
    expect(client.apiKey).toBe('env var api key');
  });

  test('with apiKey argument', () => {
    process.env['LITHIC_API_KEY'] = 'env var api key';

    const client = new Lithic({ apiKey: 'another api key' });
    expect(client.apiKey).toBe('another api key');
  });

  test('with options argument', () => {
    process.env['LITHIC_API_KEY'] = 'env var api key';

    // apiKey
    const client = new Lithic({ apiKey: 'my api key' });
    expect(client.apiKey).toBe('my api key');
  });

  test('with disabled authentication', () => {
    // fails if no API Key provided
    expect(() => {
      new Lithic();
    }).toThrow();
  });
});

describe('idempotency', () => {
  test('key can be set per-request', async () => {
    const client = new Lithic({ apiKey: 'my api key', baseURL: 'http://127.0.0.1:4010' });
    await client.accountHolders.create(
      {
        business_entity: {
          address: {
            address1: '123 Old Forest Way',
            city: 'Omaha',
            country: 'USA',
            postal_code: '68022',
            state: 'NE',
          },
          government_id: '114-123-1513',
          legal_business_name: 'Acme, Inc.',
          phone_numbers: ['+12124007676'],
        },
        beneficial_owner_entities: [
          {
            address: {
              address1: '123 Old Forest Way',
              city: 'Omaha',
              country: 'USA',
              postal_code: '68022',
              state: 'NE',
            },
            government_id: '114-123-1513',
            legal_business_name: 'Acme, Inc.',
            phone_numbers: ['+12124007676'],
          },
          {
            address: {
              address1: '123 Old Forest Way',
              city: 'Omaha',
              country: 'USA',
              postal_code: '68022',
              state: 'NE',
            },
            government_id: '114-123-1513',
            legal_business_name: 'Acme, Inc.',
            phone_numbers: ['+12124007676'],
          },
          {
            address: {
              address1: '123 Old Forest Way',
              city: 'Omaha',
              country: 'USA',
              postal_code: '68022',
              state: 'NE',
            },
            government_id: '114-123-1513',
            legal_business_name: 'Acme, Inc.',
            phone_numbers: ['+12124007676'],
          },
        ],
        beneficial_owner_individuals: [
          {
            address: {
              address1: '123 Old Forest Way',
              city: 'Omaha',
              country: 'USA',
              postal_code: '68022',
              state: 'NE',
            },
            dob: '1991-03-08 08:00:00',
            email: 'tom@middle-earth.com',
            first_name: 'Tom',
            government_id: '111-23-1412',
            last_name: 'Bombadil',
            phone_number: '+12124007676',
          },
          {
            address: {
              address1: '123 Old Forest Way',
              city: 'Omaha',
              country: 'USA',
              postal_code: '68022',
              state: 'NE',
            },
            dob: '1991-03-08 08:00:00',
            email: 'tom@middle-earth.com',
            first_name: 'Tom',
            government_id: '111-23-1412',
            last_name: 'Bombadil',
            phone_number: '+12124007676',
          },
          {
            address: {
              address1: '123 Old Forest Way',
              city: 'Omaha',
              country: 'USA',
              postal_code: '68022',
              state: 'NE',
            },
            dob: '1991-03-08 08:00:00',
            email: 'tom@middle-earth.com',
            first_name: 'Tom',
            government_id: '111-23-1412',
            last_name: 'Bombadil',
            phone_number: '+12124007676',
          },
        ],
        control_person: {
          address: {
            address1: '123 Old Forest Way',
            city: 'Omaha',
            country: 'USA',
            postal_code: '68022',
            state: 'NE',
          },
          dob: '1991-03-08 08:00:00',
          email: 'tom@middle-earth.com',
          first_name: 'Tom',
          government_id: '111-23-1412',
          last_name: 'Bombadil',
          phone_number: '+12124007676',
        },
        nature_of_business: 'Software company selling solutions to the restaurant industry',
        tos_timestamp: '2018-05-29T21:16:05Z',
        website_url: 'www.mybusiness.com',
        workflow: 'KYB_BASIC',
      },
      { idempotencyKey: 'my-idempotency-key' },
    );
  });
});
