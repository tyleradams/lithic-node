// File generated from our OpenAPI spec by Stainless.

import * as Core from '~/core';
import { APIResource } from '~/resource';
import { isRequestOptions } from '~/core';
import { Page, PageParams } from '~/pagination';

export class AuthRules extends APIResource {
  /**
   * Creates an authorization rule (Auth Rule) and applies it at the program,
   * account, or card level.
   */
  create(
    body: AuthRuleCreateParams,
    options?: Core.RequestOptions,
  ): Promise<Core.APIResponse<AuthRuleCreateResponse>> {
    return this.post('/auth_rules', { body, ...options });
  }

  /**
   * Detail the properties and entities (program, accounts, and cards) associated
   * with an existing authorization rule (Auth Rule).
   */
  retrieve(
    authRuleToken: string,
    options?: Core.RequestOptions,
  ): Promise<Core.APIResponse<AuthRuleRetrieveResponse>> {
    return this.get(`/auth_rules/${authRuleToken}`, options);
  }

  /**
   * Update the properties associated with an existing authorization rule (Auth
   * Rule).
   */
  update(
    authRuleToken: string,
    body: AuthRuleUpdateParams,
    options?: Core.RequestOptions,
  ): Promise<Core.APIResponse<AuthRuleUpdateResponse>> {
    return this.put(`/auth_rules/${authRuleToken}`, { body, ...options });
  }

  /**
   * Return all of the Auth Rules under the program.
   */
  list(query?: AuthRuleListParams, options?: Core.RequestOptions): Core.PagePromise<AuthRulesPage>;
  list(options?: Core.RequestOptions): Core.PagePromise<AuthRulesPage>;
  list(
    query: AuthRuleListParams | Core.RequestOptions = {},
    options?: Core.RequestOptions,
  ): Core.PagePromise<AuthRulesPage> {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }

    return this.getAPIList('/auth_rules', AuthRulesPage, { query, ...options });
  }

  /**
   * Applies an existing authorization rule (Auth Rule) to an program, account, or
   * card level.
   */
  apply(
    authRuleToken: string,
    body: AuthRuleApplyParams,
    options?: Core.RequestOptions,
  ): Promise<Core.APIResponse<AuthRuleApplyResponse>> {
    return this.post(`/auth_rules/${authRuleToken}/apply`, { body, ...options });
  }

  /**
   * Remove an existing authorization rule (Auth Rule) from an program, account, or
   * card-level.
   */
  remove(
    body: AuthRuleRemoveParams,
    options?: Core.RequestOptions,
  ): Promise<Core.APIResponse<AuthRuleRemoveResponse>> {
    return this.delete('/auth_rules/remove', { body, ...options });
  }
}

export class AuthRulesPage extends Page<AuthRule> {}

export interface AuthRule {
  /**
   * Array of account_token(s) identifying the accounts that the Auth Rule applies
   * to. Note that only this field or `card_tokens` can be provided for a given Auth
   * Rule.
   */
  account_tokens?: Array<string>;

  /**
   * Countries in which the Auth Rule permits transactions. Note that Lithic
   * maintains a list of countries in which all transactions are blocked; "allowing"
   * those countries in an Auth Rule does not override the Lithic-wide restrictions.
   */
  allowed_countries?: Array<string>;

  /**
   * Merchant category codes for which the Auth Rule permits transactions.
   */
  allowed_mcc?: Array<string>;

  /**
   * Address verification to confirm that postal code entered at point of transaction
   * (if applicable) matches the postal code on file for a given card. Since this
   * check is performed against the address submitted via the Enroll Consumer
   * endpoint, it should only be used in cases where card users are enrolled with
   * their own accounts. Available values:
   *
   * - `ZIP_ONLY` - AVS check is performed to confirm ZIP code entered at point of
   *   transaction (if applicable) matches address on file.
   */
  avs_type?: 'ZIP_ONLY';

  /**
   * Countries in which the Auth Rule automatically declines transactions.
   */
  blocked_countries?: Array<string>;

  /**
   * Merchant category codes for which the Auth Rule automatically declines
   * transactions.
   */
  blocked_mcc?: Array<string>;

  /**
   * Array of card_token(s) identifying the cards that the Auth Rule applies to. Note
   * that only this field or `account_tokens` can be provided for a given Auth Rule.
   */
  card_tokens?: Array<string>;

  /**
   * Boolean indicating whether the Auth Rule is applied at the program level.
   */
  program_level?: boolean;
}

export interface AuthRuleCreateResponse {
  data?: AuthRule;
}

export interface AuthRuleRetrieveResponse {
  data?: Array<AuthRule>;
}

export interface AuthRuleUpdateResponse {
  data?: AuthRule;
}

export interface AuthRuleApplyResponse {
  data?: AuthRule;
}

export interface AuthRuleRemoveResponse {
  account_tokens?: Array<string>;

  card_tokens?: Array<string>;

  previous_auth_rule_tokens?: Array<string>;

  program_level?: boolean;
}

export interface AuthRuleCreateParams {
  /**
   * Array of account_token(s) identifying the accounts that the Auth Rule applies
   * to. Note that only this field or `card_tokens` can be provided for a given Auth
   * Rule.
   */
  account_tokens?: Array<string>;

  /**
   * Countries in which the Auth Rule permits transactions. Note that Lithic
   * maintains a list of countries in which all transactions are blocked; "allowing"
   * those countries in an Auth Rule does not override the Lithic-wide restrictions.
   */
  allowed_countries?: Array<string>;

  /**
   * Merchant category codes for which the Auth Rule permits transactions.
   */
  allowed_mcc?: Array<string>;

  /**
   * Address verification to confirm that postal code entered at point of transaction
   * (if applicable) matches the postal code on file for a given card. Since this
   * check is performed against the address submitted via the Enroll Consumer
   * endpoint, it should only be used in cases where card users are enrolled with
   * their own accounts. Available values:
   *
   * - `ZIP_ONLY` - AVS check is performed to confirm ZIP code entered at point of
   *   transaction (if applicable) matches address on file.
   */
  avs_type?: 'ZIP_ONLY';

  /**
   * Countries in which the Auth Rule automatically declines transactions.
   */
  blocked_countries?: Array<string>;

  /**
   * Merchant category codes for which the Auth Rule automatically declines
   * transactions.
   */
  blocked_mcc?: Array<string>;

  /**
   * Array of card_token(s) identifying the cards that the Auth Rule applies to. Note
   * that only this field or `account_tokens` can be provided for a given Auth Rule.
   */
  card_tokens?: Array<string>;

  /**
   * Boolean indicating whether the Auth Rule is applied at the program level.
   */
  program_level?: boolean;
}

export interface AuthRuleUpdateParams {
  /**
   * Array of country codes for which the Auth Rule will permit transactions. Note
   * that only this field or `blocked_countries` can be used for a given Auth Rule.
   */
  allowed_countries?: Array<string>;

  /**
   * Array of merchant category codes for which the Auth Rule will permit
   * transactions. Note that only this field or `blocked_mcc` can be used for a given
   * Auth Rule.
   */
  allowed_mcc?: Array<string>;

  /**
   * Address verification to confirm that postal code entered at point of transaction
   * (if applicable) matches the postal code on file for a given card.
   */
  avs_type?: 'ZIP_ONLY';

  /**
   * Array of country codes for which the Auth Rule will automatically decline
   * transactions. Note that only this field or `allowed_countries` can be used for a
   * given Auth Rule.
   */
  blocked_countries?: Array<string>;

  /**
   * Array of merchant category codes for which the Auth Rule will automatically
   * decline transactions. Note that only this field or `allowed_mcc` can be used for
   * a given Auth Rule.
   */
  blocked_mcc?: Array<string>;
}

export interface AuthRuleListParams extends PageParams {}

export interface AuthRuleApplyParams {
  /**
   * Array of account_token(s) identifying the accounts that the Auth Rule applies
   * to. Note that only this field or `card_tokens` can be provided for a given Auth
   * Rule.
   */
  account_tokens?: Array<string>;

  /**
   * Array of card_token(s) identifying the cards that the Auth Rule applies to. Note
   * that only this field or `account_tokens` can be provided for a given Auth Rule.
   */
  card_tokens?: Array<string>;

  /**
   * Boolean indicating whether the Auth Rule is applied at the program level.
   */
  program_level?: boolean;
}

export interface AuthRuleRemoveParams {
  /**
   * Array of account_token(s) identifying the accounts that the Auth Rule applies
   * to. Note that only this field or `card_tokens` can be provided for a given Auth
   * Rule.
   */
  account_tokens?: Array<string>;

  /**
   * Array of card_token(s) identifying the cards that the Auth Rule applies to. Note
   * that only this field or `account_tokens` can be provided for a given Auth Rule.
   */
  card_tokens?: Array<string>;

  /**
   * Boolean indicating whether the Auth Rule is applied at the program level.
   */
  program_level?: boolean;
}
