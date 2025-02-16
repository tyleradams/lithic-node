// File generated from our OpenAPI spec by Stainless.

import * as Core from '~/core';
import { APIResource } from '~/resource';
import * as Shared from '~/resources/shared';

export class AccountHolders extends APIResource {
  /**
   * Run an individual or business's information through the Customer Identification
   * Program (CIP) and return an `account_token` if the status is accepted or pending
   * (i.e., further action required). All calls to this endpoint will return an
   * immediate response - though in some cases, the response may indicate the
   * workflow is under review or further action will be needed to complete the
   * account creation process. This endpoint can only be used on accounts that are
   * part of the program the calling API key manages.
   */
  create(
    body: AccountHolderCreateParams,
    options?: Core.RequestOptions,
  ): Promise<Core.APIResponse<AccountHolder>> {
    return this.post('/account_holders', { body, ...options });
  }

  /**
   * Check the current status of a KYC or KYB evaluation.
   */
  retrieve(
    accountHolderToken: string,
    options?: Core.RequestOptions,
  ): Promise<Core.APIResponse<AccountHolder>> {
    return this.get(`/account_holders/${accountHolderToken}`, options);
  }

  /**
   * Update the contact information associated with a particular account holder.
   */
  update(
    accountHolderToken: string,
    body: AccountHolderUpdateParams,
    options?: Core.RequestOptions,
  ): Promise<Core.APIResponse<AccountHolderUpdateResponse>> {
    return this.patch(`/account_holders/${accountHolderToken}`, { body, ...options });
  }

  /**
   * Create a webhook to receive KYC or KYB evaluation events.
   *
   * There are two types of account holder webhooks:
   *
   * - `verification`: Webhook sent when the status of a KYC or KYB evaluation
   *   changes from `PENDING_DOCUMENT` (KYC) or `PENDING` (KYB) to `ACCEPTED` or
   *   `REJECTED`.
   * - `document_upload_front`/`document_upload_back`: Webhook sent when a document
   *   upload fails.
   *
   * After a webhook has been created, this endpoint can be used to rotate a webhooks
   * HMAC token or modify the registered URL. Only a single webhook is allowed per
   * program. Since HMAC verification is available, the IP addresses from which
   * KYC/KYB webhooks are sent are subject to change.
   */
  createWebhook(
    body: AccountHolderCreateWebhookParams,
    options?: Core.RequestOptions,
  ): Promise<Core.APIResponse<AccountHolderCreateWebhookResponse>> {
    return this.post('/webhooks/account_holders', { body, ...options });
  }

  /**
   * Retrieve the status of account holder document uploads, or retrieve the upload
   * URLs to process your image uploads.
   *
   * Note that this is not equivalent to checking the status of the KYC evaluation
   * overall (a document may be successfully uploaded but not be sufficient for KYC
   * to pass).
   *
   * In the event your upload URLs have expired, calling this endpoint will refresh
   * them. Similarly, in the event a previous account holder document upload has
   * failed, you can use this endpoint to get a new upload URL for the failed image
   * upload.
   *
   * When a new document upload is generated for a failed attempt, the response will
   * show an additional entry in the `required_document_uploads` list in a `PENDING`
   * state for the corresponding `image_type`.
   */
  listDocuments(
    accountHolderToken: string,
    options?: Core.RequestOptions,
  ): Promise<Core.APIResponse<AccountHolderListDocumentsResponse>> {
    return this.get(`/account_holders/${accountHolderToken}/documents`, options);
  }

  /**
   * Resubmit a KYC submission. This endpoint should be used in cases where a KYC
   * submission returned a `PENDING_RESUBMIT` result, meaning one or more critical
   * KYC fields may have been mis-entered and the individual's identity has not yet
   * been successfully verified. This step must be completed in order to proceed with
   * the KYC evaluation.
   *
   * Two resubmission attempts are permitted via this endpoint before a `REJECTED`
   * status is returned and the account creation process is ended.
   */
  resubmit(
    accountHolderToken: string,
    body: AccountHolderResubmitParams,
    options?: Core.RequestOptions,
  ): Promise<Core.APIResponse<AccountHolder>> {
    return this.post(`/account_holders/${accountHolderToken}/resubmit`, { body, ...options });
  }

  /**
   * Check the status of an account holder document upload, or retrieve the upload
   * URLs to process your image uploads.
   *
   * Note that this is not equivalent to checking the status of the KYC evaluation
   * overall (a document may be successfully uploaded but not be sufficient for KYC
   * to pass).
   *
   * In the event your upload URLs have expired, calling this endpoint will refresh
   * them. Similarly, in the event a document upload has failed, you can use this
   * endpoint to get a new upload URL for the failed image upload.
   *
   * When a new account holder document upload is generated for a failed attempt, the
   * response will show an additional entry in the `required_document_uploads` array
   * in a `PENDING` state for the corresponding `image_type`.
   */
  retrieveDocument(
    accountHolderToken: string,
    documentToken: string,
    options?: Core.RequestOptions,
  ): Promise<Core.APIResponse<AccountHolderDocument>> {
    return this.get(`/account_holders/${accountHolderToken}/documents/${documentToken}`, options);
  }

  /**
   * Use this endpoint to identify which type of supported government-issued
   * documentation you will upload for further verification. It will return two URLs
   * to upload your document images to - one for the front image and one for the back
   * image.
   *
   * This endpoint is only valid for evaluations in a `PENDING_DOCUMENT` state.
   *
   * Uploaded images must either be a `jpg` or `png` file, and each must be less than
   * 15 MiB. Once both required uploads have been successfully completed, your
   * document will be run through KYC verification.
   *
   * If you have registered a webhook, you will receive evaluation updates for any
   * document submission evaluations, as well as for any failed document uploads.
   *
   * Two document submission attempts are permitted via this endpoint before a
   * `REJECTED` status is returned and the account creation process is ended.
   * Currently only one type of account holder document is supported per KYC
   * verification.
   */
  uploadDocument(
    accountHolderToken: string,
    body: AccountHolderUploadDocumentParams,
    options?: Core.RequestOptions,
  ): Promise<Core.APIResponse<AccountHolderDocument>> {
    return this.post(`/account_holders/${accountHolderToken}/documents`, { body, ...options });
  }
}

export interface AccountHolder {
  /**
   * Globally unique identifier for the account.
   */
  account_token?: string;

  /**
   * KYC and KYB evaluation states.
   *
   * Note: `PENDING_RESUBMIT` and `PENDING_DOCUMENT` are only applicable for the
   * `ADVANCED` workflow.
   */
  status?: 'ACCEPTED' | 'REJECTED' | 'PENDING_RESUBMIT' | 'PENDING_DOCUMENT';

  /**
   * Reason for the evaluation status.
   */
  status_reasons?: Array<
    | 'ADDRESS_VERIFICATION_FAILURE'
    | 'AGE_THRESHOLD_FAILURE'
    | 'COMPLETE_VERIFICATION_FAILURE'
    | 'DOB_VERIFICATION_FAILURE'
    | 'ID_VERIFICATION_FAILURE'
    | 'MAX_DOCUMENT_ATTEMPTS'
    | 'MAX_RESUBMISSION_ATTEMPTS'
    | 'NAME_VERIFICATION_FAILURE'
    | 'OTHER_VERIFICATION_FAILURE'
    | 'RISK_THRESHOLD_FAILURE'
    | 'WATCHLIST_ALERT_FAILURE'
  >;

  /**
   * Globally unique identifier for the account holder.
   */
  token?: string;
}

/**
 * Describes the document and the required document image uploads required to
 * re-run KYC.
 */
export interface AccountHolderDocument {
  /**
   * Globally unique identifier for the account holder.
   */
  account_holder_token?: string;

  /**
   * Type of documentation to be submitted for verification.
   */
  document_type?: 'commercial_license' | 'drivers_license' | 'passport' | 'passport_card' | 'visa';

  required_document_uploads?: Array<AccountHolderDocument.RequiredDocumentUploads>;

  /**
   * Globally unique identifier for the document.
   */
  token?: string;
}

export namespace AccountHolderDocument {
  export interface RequiredDocumentUploads {
    /**
     * Type of image to upload.
     */
    image_type?: 'back' | 'front';

    /**
     * Status of document image upload.
     */
    status?: 'COMPLETED' | 'FAILED' | 'PENDING' | 'UPLOADED';

    status_reasons?: Array<
      | 'BACK_IMAGE_BLURRY'
      | 'FILE_SIZE_TOO_LARGE'
      | 'FRONT_IMAGE_BLURRY'
      | 'FRONT_IMAGE_GLARE'
      | 'INVALID_FILE_TYPE'
      | 'UNKNOWN_ERROR'
    >;

    /**
     * URL to upload document image to.
     *
     * Note that the upload URLs expire after 7 days. If an upload URL expires, you can
     * refresh the URLs by retrieving the document upload from
     * `GET /account_holders/{account_holder_token}/documents`.
     */
    upload_url?: string;
  }
}

export interface AccountHolderUpdateResponse {
  /**
   * The newly updated email for the account holder
   */
  email?: string;

  /**
   * The newly updated phone_number for the account holder
   */
  phone_number?: string;

  /**
   * The token for the account holder that was updated
   */
  token?: string;
}

export interface AccountHolderListDocumentsResponse {
  data?: Array<AccountHolderDocument>;
}

export interface AccountHolderCreateWebhookResponse {
  data?: AccountHolderCreateWebhookResponse.Data;
}

export namespace AccountHolderCreateWebhookResponse {
  export interface Data {
    /**
     * Shared secret which can optionally be used to validate the authenticity of
     * incoming identity webhooks.
     */
    hmac_token?: string;
  }
}

export type AccountHolderCreateParams =
  | AccountHolderCreateParams.KYB
  | AccountHolderCreateParams.KYC
  | AccountHolderCreateParams.KYCExempt;

export namespace AccountHolderCreateParams {
  export interface KYB {
    /**
     * List of all entities with >25% ownership in the company. If no entity or
     * individual owns >25% of the company, and the largest shareholder is an entity,
     * please identify them in this field. See
     * [FinCEN requirements](https://www.fincen.gov/sites/default/files/shared/CDD_Rev6.7_Sept_2017_Certificate.pdf)
     * (Section I) for more background. If no business owner is an entity, pass in an
     * empty list. However, either this parameter or `beneficial_owner_individuals`
     * must be populated. on entities that should be included.
     */
    beneficial_owner_entities: Array<KYB.BeneficialOwnerEntities>;

    /**
     * List of all individuals with >25% ownership in the company. If no entity or
     * individual owns >25% of the company, and the largest shareholder is an
     * individual, please identify them in this field. See
     * [FinCEN requirements](https://www.fincen.gov/sites/default/files/shared/CDD_Rev6.7_Sept_2017_Certificate.pdf)
     * (Section I) for more background on individuals that should be included. If no
     * individual is an entity, pass in an empty list. However, either this parameter
     * or `beneficial_owner_entities` must be populated.
     */
    beneficial_owner_individuals: Array<KYB.BeneficialOwnerIndividuals>;

    /**
     * Information for business for which the account is being opened and KYB is being
     * run.
     */
    business_entity: KYB.BusinessEntity;

    /**
     * An individual with significant responsibility for managing the legal entity
     * (e.g., a Chief Executive Officer, Chief Financial Officer, Chief Operating
     * Officer, Managing Member, General Partner, President, Vice President, or
     * Treasurer). This can be an executive, or someone who will have program-wide
     * access to the cards that Lithic will provide. In some cases, this individual
     * could also be a beneficial owner listed above. See
     * [FinCEN requirements](https://www.fincen.gov/sites/default/files/shared/CDD_Rev6.7_Sept_2017_Certificate.pdf)
     * (Section II) for more background.
     */
    control_person: KYB.ControlPerson;

    /**
     * Short description of the company's line of business (i.e., what does the company
     * do?).
     */
    nature_of_business: string;

    /**
     * An RFC 3339 timestamp indicating when the account holder accepted the applicable
     * legal agreements (e.g., cardholder terms) as agreed upon during API customer's
     * implementation with Lithic.
     */
    tos_timestamp: string;

    /**
     * Company website URL.
     */
    website_url: string;

    /**
     * Specifies the type of KYB workflow to run.
     */
    workflow: 'KYB_BASIC' | 'KYB_BYO';

    /**
     * An RFC 3339 timestamp indicating when precomputed KYC was completed on the
     * business with a pass result.
     *
     * This field is required only if workflow type is `KYB_BYO`.
     */
    kyb_passed_timestamp?: string;
  }

  export namespace KYB {
    export interface BusinessEntity {
      /**
       * Business's physical address - PO boxes, UPS drops, and FedEx drops are not
       * acceptable; APO/FPO are acceptable.
       */
      address: Shared.Address;

      /**
       * Government-issued identification number. US Federal Employer Identification
       * Numbers (EIN) are currently supported, entered as full nine-digits, with or
       * without hyphens.
       */
      government_id: string;

      /**
       * Legal (formal) business name.
       */
      legal_business_name: string;

      /**
       * One or more of the business's phone number(s), entered as a list in E.164
       * format.
       */
      phone_numbers: Array<string>;

      /**
       * Any name that the business operates under that is not its legal business name
       * (if applicable).
       */
      dba_business_name?: string;

      /**
       * Parent company name (if applicable).
       */
      parent_company?: string;
    }

    export interface BeneficialOwnerEntities {
      /**
       * Business's physical address - PO boxes, UPS drops, and FedEx drops are not
       * acceptable; APO/FPO are acceptable.
       */
      address: Shared.Address;

      /**
       * Government-issued identification number. US Federal Employer Identification
       * Numbers (EIN) are currently supported, entered as full nine-digits, with or
       * without hyphens.
       */
      government_id: string;

      /**
       * Legal (formal) business name.
       */
      legal_business_name: string;

      /**
       * One or more of the business's phone number(s), entered as a list in E.164
       * format.
       */
      phone_numbers: Array<string>;

      /**
       * Any name that the business operates under that is not its legal business name
       * (if applicable).
       */
      dba_business_name?: string;

      /**
       * Parent company name (if applicable).
       */
      parent_company?: string;
    }

    export interface BeneficialOwnerIndividuals {
      /**
       * Individual's current address - PO boxes, UPS drops, and FedEx drops are not
       * acceptable; APO/FPO are acceptable. Only USA addresses are currently supported.
       */
      address: Shared.Address;

      /**
       * Individual's date of birth, as an RFC 3339 date.
       */
      dob: string;

      /**
       * Individual's email address. If utilizing Lithic for chargeback processing, this
       * customer email address may be used to communicate dispute status and resolution.
       */
      email: string;

      /**
       * Individual's first name, as it appears on government-issued identity documents.
       */
      first_name: string;

      /**
       * Government-issued identification number (required for identity verification and
       * compliance with banking regulations). Social Security Numbers (SSN) and
       * Individual Taxpayer Identification Numbers (ITIN) are currently supported,
       * entered as full nine-digits, with or without hyphens
       */
      government_id: string;

      /**
       * Individual's last name, as it appears on government-issued identity documents.
       */
      last_name: string;

      /**
       * Individual's phone number, entered in E.164 format.
       */
      phone_number: string;
    }

    export interface ControlPerson {
      /**
       * Individual's current address - PO boxes, UPS drops, and FedEx drops are not
       * acceptable; APO/FPO are acceptable. Only USA addresses are currently supported.
       */
      address: Shared.Address;

      /**
       * Individual's date of birth, as an RFC 3339 date.
       */
      dob: string;

      /**
       * Individual's email address. If utilizing Lithic for chargeback processing, this
       * customer email address may be used to communicate dispute status and resolution.
       */
      email: string;

      /**
       * Individual's first name, as it appears on government-issued identity documents.
       */
      first_name: string;

      /**
       * Government-issued identification number (required for identity verification and
       * compliance with banking regulations). Social Security Numbers (SSN) and
       * Individual Taxpayer Identification Numbers (ITIN) are currently supported,
       * entered as full nine-digits, with or without hyphens
       */
      government_id: string;

      /**
       * Individual's last name, as it appears on government-issued identity documents.
       */
      last_name: string;

      /**
       * Individual's phone number, entered in E.164 format.
       */
      phone_number: string;
    }
  }

  export interface KYC {
    /**
     * Information on individual for whom the account is being opened and KYC is being
     * run.
     */
    individual: KYC.Individual;

    /**
     * An RFC 3339 timestamp indicating when the account holder accepted the applicable
     * legal agreements (e.g., cardholder terms) as agreed upon during API customer's
     * implementation with Lithic.
     */
    tos_timestamp: string;

    /**
     * Specifies the type of KYC workflow to run.
     */
    workflow: 'KYC_ADVANCED' | 'KYC_BASIC' | 'KYC_BYO';

    /**
     * An RFC 3339 timestamp indicating when precomputed KYC was completed on the
     * individual with a pass result.
     *
     * This field is required only if workflow type is `KYC_BYO`.
     */
    kyc_passed_timestamp?: string;
  }

  export namespace KYC {
    export interface Individual {
      /**
       * Individual's current address - PO boxes, UPS drops, and FedEx drops are not
       * acceptable; APO/FPO are acceptable. Only USA addresses are currently supported.
       */
      address: Shared.Address;

      /**
       * Individual's date of birth, as an RFC 3339 date.
       */
      dob: string;

      /**
       * Individual's email address. If utilizing Lithic for chargeback processing, this
       * customer email address may be used to communicate dispute status and resolution.
       */
      email: string;

      /**
       * Individual's first name, as it appears on government-issued identity documents.
       */
      first_name: string;

      /**
       * Government-issued identification number (required for identity verification and
       * compliance with banking regulations). Social Security Numbers (SSN) and
       * Individual Taxpayer Identification Numbers (ITIN) are currently supported,
       * entered as full nine-digits, with or without hyphens
       */
      government_id: string;

      /**
       * Individual's last name, as it appears on government-issued identity documents.
       */
      last_name: string;

      /**
       * Individual's phone number, entered in E.164 format.
       */
      phone_number: string;
    }
  }

  export interface KYCExempt {
    /**
     * The KYC Exempt user's email
     */
    email: string;

    /**
     * The KYC Exempt user's first name
     */
    first_name: string;

    /**
     * Specifies the type of KYC Exempt user
     */
    kyc_exemption_type: 'AUTHORIZED_USER' | 'PREPAID_CARD_USER';

    /**
     * The KYC Exempt user's last name
     */
    last_name: string;

    /**
     * The KYC Exempt user's phone number
     */
    phone_number: string;

    /**
     * Specifies the workflow type. This must be 'KYC_EXEMPT'
     */
    workflow: 'KYC_EXEMPT';

    /**
     * KYC Exempt user's current address - PO boxes, UPS drops, and FedEx drops are not
     * acceptable; APO/FPO are acceptable. Only USA addresses are currently supported.
     */
    address?: Shared.Address;
  }
}

export interface AccountHolderUpdateParams {
  /**
   * Account holder's email address. The primary purpose of this field is for
   * cardholder identification and verification during the digital wallet
   * tokenization process.
   */
  email?: string;

  /**
   * Account holder's phone number, entered in E.164 format. The primary purpose of
   * this field is for cardholder identification and verification during the digital
   * wallet tokenization process.
   */
  phone_number?: string;
}

export interface AccountHolderCreateWebhookParams {
  /**
   * URL to receive webhook requests. Must be a valid HTTPS address.
   */
  url: string;
}

export interface AccountHolderResubmitParams {
  /**
   * Information on individual for whom the account is being opened and KYC is being
   * re-run.
   */
  individual: AccountHolderResubmitParams.Individual;

  /**
   * An RFC 3339 timestamp indicating when the account holder accepted the applicable
   * legal agreements (e.g., cardholder terms) as agreed upon during API customer's
   * implementation with Lithic.
   */
  tos_timestamp: string;

  workflow: 'KYC_ADVANCED';
}

export namespace AccountHolderResubmitParams {
  export interface Individual {
    /**
     * Individual's current address - PO boxes, UPS drops, and FedEx drops are not
     * acceptable; APO/FPO are acceptable. Only USA addresses are currently supported.
     */
    address: Shared.Address;

    /**
     * Individual's date of birth, as an RFC 3339 date.
     */
    dob: string;

    /**
     * Individual's email address. If utilizing Lithic for chargeback processing, this
     * customer email address may be used to communicate dispute status and resolution.
     */
    email: string;

    /**
     * Individual's first name, as it appears on government-issued identity documents.
     */
    first_name: string;

    /**
     * Government-issued identification number (required for identity verification and
     * compliance with banking regulations). Social Security Numbers (SSN) and
     * Individual Taxpayer Identification Numbers (ITIN) are currently supported,
     * entered as full nine-digits, with or without hyphens
     */
    government_id: string;

    /**
     * Individual's last name, as it appears on government-issued identity documents.
     */
    last_name: string;

    /**
     * Individual's phone number, entered in E.164 format.
     */
    phone_number: string;
  }
}

export interface AccountHolderUploadDocumentParams {
  /**
   * Type of the document to upload.
   */
  document_type: 'commercial_license' | 'drivers_license' | 'passport' | 'passport_card' | 'visa';
}
