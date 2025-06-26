/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const loggerNamespace = '@adobe/aio-lib-console-project-installation'
const logger = require('@adobe/aio-lib-core-logging')(loggerNamespace, { level: process.env.LOG_LEVEL })

const SERVICE_TYPE_ENTERPRISE = 'entp'
const SERVICE_TYPE_ADOBEID = 'adobeid'
const SUPPORTED_SERVICE_TYPES = [SERVICE_TYPE_ENTERPRISE, SERVICE_TYPE_ADOBEID]

const SERVICE_INTEGRATION_TYPE_SERVICE = 'service'
const SERVICE_INTEGRATION_TYPE_OAUTH = 'oauth_server_to_server'
const SERVICE_INTEGRATION_TYPE_APIKEY = 'apikey'

// supported platforms
const SERVICE_TYPE_ADOBEID_PLATFORM_APIKEY = 'apiKey'

/**
 * Configure APIs required for the template.
 * @param {object} params The parameters object
 * @param {object} params.consoleClient The Adobe Console API client.
 * @param {string} params.orgId The ID of the organization the project exists in.
 * @param {string} params.projectId The ID of the project to configure the APIs for.
 * @param {Array<object>} params.apis The APIs to configure used by the template.
 * @param {object} params.productProfiles The product profiles to configure the services for.
 * [
 *  {
 *      sdkCode: "CloudManagerSDK",
 *      licenseConfigs: [
 *         {
            “id”: “131094414”,
            “productId”: “8F5Z52CBD0V8PPA0MENP9DS0Y8”,
            “name”: “standard - Cloud Manager - IO Integrations”
           }
 *      ]
 *  }
 * ]
 */
const configureAPIs = async ({ consoleClient, orgId, projectId, apis, productProfiles }) => {
  logger.debug(`apis to configure: ${JSON.stringify(apis)}`)
  const orgServices = (await consoleClient.getServicesForOrg(orgId)).body
  const currentWorkspaces = (await consoleClient.getWorkspacesForProject(orgId, projectId)).body
  console.log('orgServices', orgServices)
  for (const workspace of currentWorkspaces) {
    const workspaceId = workspace.id

    const enterpriseServices = []
    const adobeIdServices = []
    for (const api of apis) {
      if (service && service.enabled === true) {
        const serviceType = service.type
        switch (serviceType) {
          case SERVICE_TYPE_ENTERPRISE: {
            enterpriseServices.push(service.code)
            break
          }
          case SERVICE_TYPE_ADOBEID: {
            adobeIdServices.push(service.code)
            break
          }
          default: {
            const errorMessage = `Unsupported service type, "${serviceType}". Supported service types are: ${SUPPORTED_SERVICE_TYPES.join(',')}.`
            logger.error(errorMessage)
            throw new Error(errorMessage)
          }
        }
      } else {
        const errorMessage = `Service code "${api.code}" not found in the organization.`
        logger.error(errorMessage)
        throw new Error(errorMessage)
      }
    }

    // Onboard APIs
    if (enterpriseServices.length > 0) {
      await onboardEnterpriseApi({ consoleClient, orgId, projectId, workspaceId, services: enterpriseServices, productProfiles })
    }

    if (adobeIdServices.length > 0) {
      await onboardAdobeIdApi({ consoleClient, orgId, projectId, workspaceId, services: adobeIdServices })
    }
  }
}

/**
 * Onboards an Enterprise API to the workspace.
 * @param {object} params The parameters object
 * @param {object} params.consoleClient The Adobe Console API client.
 * @param {string} params.orgId The ID of the organization the project exists in.
 * @param {string} params.projectId The ID of the project to configure the APIs for.
 * @param {string} params.workspaceId The ID of the workspace to configure the APIs for.
 * @param {Array} params.services A list of services to onboard.
 * @param {Array} params.productProfiles The product profiles to configure the services for.
 * @returns {Promise<void>} A promise that resolves when the Enterprise API is onboarded.
 */
const onboardEnterpriseApi = async ({ consoleClient, orgId, projectId, workspaceId, services, productProfiles }) => {
  const credentialType = SERVICE_TYPE_ENTERPRISE
  const credentialId = await getFirstWorkspaceCredential({ consoleClient, orgId, projectId, workspaceId })
  const servicesInfo = await getServicesInfo({ consoleClient, orgId, services, productProfilesFilter: productProfiles })
  await subscribeAPIS({ consoleClient, orgId, projectId, workspaceId, credentialType, credentialId, servicesInfo })
}

/**
 * Onboards an AdobeId API to the workspace.
 * @param {object} params The parameters object
 * @param {object} params.consoleClient The Adobe Console API client.
 * @param {string} params.orgId The ID of the organization the project exists in.
 * @param {string} params.projectId The ID of the project to configure the APIs for.
 * @param {string} params.workspaceId The ID of the workspace to configure the APIs for.
 * @param {object} params.services A list of services to onboard.
 * @returns {Promise<void>} A promise that resolves when the AdobeId API is onboarded.
 */
const onboardAdobeIdApi = async ({ consoleClient, orgId, projectId, workspaceId, services }) => {
  const credentialType = SERVICE_TYPE_ADOBEID
  const credentialId = await getWorkspaceAdobeIdCredentials({ consoleClient, orgId, projectId, workspaceId })
  const servicesInfo = await getServicesInfo({ consoleClient, orgId, services })
  await subscribeAPIS({ consoleClient, orgId, projectId, workspaceId, credentialType, credentialId, servicesInfo })
}

/**
 * Get workspace credential. If one doesn't exist, create an OAuth credential.
 * @param {object} params The parameters object
 * @param {object} params.consoleClient The Adobe Console API client.
 * @param {string} params.orgId The ID of the organization the project exists in.
 * @param {string} params.projectId The ID of the project to configure the APIs for.
 * @param {string} params.workspaceId The ID of the workspace to get the credentials for.
 * @returns {string} The credential ID.
 * @throws {Error} If the credentials cannot be retrieved.
 */
const getFirstWorkspaceCredential = async ({ consoleClient, orgId, projectId, workspaceId }) => {
  const jwtCredentialId = await getFirstWorkspaceEnterpriseCredential({ consoleClient, orgId, projectId, workspaceId })
  const oauthCredentialId = await getFirstWorkspaceOAuthCredential({ consoleClient, orgId, projectId, workspaceId })

  // Check for existing credentials, giving preference to OAuth credentials.
  if (oauthCredentialId) {
    return oauthCredentialId
  } else if (jwtCredentialId) {
    return jwtCredentialId
  }

  // If there is no credential on the workspace, create an OAuth credential.
  const ts = new Date().getTime()
  const credentialNameOAuth = 'cred-oauth' + ts
  const credential = (await consoleClient.createOAuthServerToServerCredential(orgId, projectId, workspaceId, credentialNameOAuth, 'Oauth Credential')).body
  return credential.id
}

/**
 * Get first OAuth credential for the workspace.
 * @param {object} params The parameters object
 * @param {object} params.consoleClient The Adobe Console API client.
 * @param {string} params.orgId The ID of the organization the project exists in.
 * @param {string} params.projectId The ID of the project to configure the APIs for.
 * @param {string} params.workspaceId The ID of the workspace to get the credentials for.
 * @returns {string} The credential ID.
 * @throws {Error} If the credentials cannot be retrieved.
 */
const getFirstWorkspaceOAuthCredential = async ({ consoleClient, orgId, projectId, workspaceId }) => {
  const credentials = (await consoleClient.getCredentials(orgId, projectId, workspaceId)).body
  const credential = credentials.find(c => c.flow_type === SERVICE_TYPE_ENTERPRISE && c.integration_type === SERVICE_INTEGRATION_TYPE_OAUTH)
  return credential?.id_integration
}

/**
 * Get first Enterprise credential for the workspace.
 * @param {object} params The parameters object
 * @param {object} params.consoleClient The Adobe Console API client.
 * @param {string} params.orgId The ID of the organization the project exists in.
 * @param {string} params.projectId The ID of the project to configure the APIs for.
 * @param {string} params.workspaceId The ID of the workspace to get the credentials for.
 * @returns {string} The credential ID.
 * @throws {Error} If the credentials cannot be retrieved.
 */
const getFirstWorkspaceEnterpriseCredential = async ({ consoleClient, orgId, projectId, workspaceId }) => {
  const credentials = (await consoleClient.getCredentials(orgId, projectId, workspaceId)).body
  const credential = credentials.find(c => c.flow_type === SERVICE_TYPE_ENTERPRISE && c.integration_type === SERVICE_INTEGRATION_TYPE_SERVICE)
  return credential?.id_integration
}

/**
 * Get adobeid credentials for the workspace.
 * @param {object} params The parameters object
 * @param {object} params.consoleClient The Adobe Console API client.
 * @param {string} params.orgId The ID of the organization the project exists in.
 * @param {string} params.projectId The ID of the project to configure the APIs for.
 * @param {string} params.workspaceId The ID of the workspace to get the credentials for.
 * @returns {string} The credential ID.
 * @throws {Error} If the credentials cannot be retrieved.
 */
const getWorkspaceAdobeIdCredentials = async ({ consoleClient, orgId, projectId, workspaceId }) => {
  const credentials = (await consoleClient.getCredentials(orgId, projectId, workspaceId)).body
  const credential = credentials.find(c => c.flow_type === SERVICE_TYPE_ADOBEID && c.integration_type === SERVICE_INTEGRATION_TYPE_APIKEY)
  let credentialId = credential && credential.id_integration
  if (!credentialId) {
    const ts = new Date().getTime()
    const domain = 'www.graph.adobe.io' // @todo a domain value should be configurable, as an option it can be asked during a template installation process or defined in a template's install.yaml configuration file
    const adobeIdCredential = (await consoleClient.createAdobeIdCredential(orgId, projectId, workspaceId, { name: `AdobeId Credentials ${ts}`, description: 'AdobeId Credentials', platform: SERVICE_TYPE_ADOBEID_PLATFORM_APIKEY, domain })).body
    credentialId = adobeIdCredential.id
  }

  return credentialId
}

/**
 * Get Service Info for the Organization. If productProfilesFilter is provided, filter the product profiles by the provided list.
 * @param {object} params The parameters object
 * @param {object} params.consoleClient The Adobe Console API client.
 * @param {string} params.orgId The ID of the organization the project exists in.
 * @param {Array} params.services A list of services to get the info for.
 * @param {Array} params.productProfilesFilter A list of product profiles to filter by
 * @returns {object} The services info presented as a map.
 */
const getServicesInfo = async ({ consoleClient, orgId, services, productProfilesFilter }) => {
  const orgServicesWithProductProfiles = (await consoleClient.getServicesForOrg(orgId)).body.filter(s => s.enabled)
  const servicesInfo = services.map(serviceCode => {
    const orgServiceDefinition = orgServicesWithProductProfiles.find(os => os.code === serviceCode)

    if (productProfilesFilter && productProfilesFilter.length > 0) {
      const productProfilesFilterForService = productProfilesFilter.find(p => p.sdkCode === serviceCode)?.licenseConfigs
      if (productProfilesFilterForService) {
        const filteredProductProfiles = orgServiceDefinition?.properties?.licenseConfigs?.filter(l => productProfilesFilterForService.find(productProfile => productProfile.id === l.id))
        orgServiceDefinition.properties.licenseConfigs = filteredProductProfiles
      }
    }

    return {
      sdkCode: serviceCode,
      name: orgServiceDefinition?.name || null,
      roles: orgServiceDefinition?.properties?.roles || null,
      licenseConfigs: (orgServiceDefinition?.properties?.licenseConfigs || null) && orgServiceDefinition.properties.licenseConfigs.map(l => ({
        op: 'add',
        id: l?.id,
        productId: l?.productId
      }))
    }
  })
  logger.debug(`service info: ${JSON.stringify(servicesInfo)}`)
  return servicesInfo
}

/**
 * Subscribe an API to a workspace.
 * @param {object} params The parameters object
 * @param {object} params.consoleClient The Adobe Console API client.
 * @param {string} params.orgId The ID of the organization the project exists in.
 * @param {string} params.projectId The ID of the project to configure the APIs for.
 * @param {string} params.workspaceId The ID of the workspace to subscribe the API to.
 * @param {string} params.credentialType The type of credential to get. Defaults to 'entp'.
 * @param {string} params.credentialId The ID of the credential to use.
 * @param {Map} params.servicesInfo The services info presented as a map.
 */
const subscribeAPIS = async ({ consoleClient, orgId, projectId, workspaceId, credentialType, credentialId, servicesInfo }) => {
  try {
    const subscriptionResponse = (await consoleClient.subscribeCredentialToServices(
      orgId,
      projectId,
      workspaceId,
      credentialType,
      credentialId,
      servicesInfo
    )).body
    logger.debug(`subscription response: ${JSON.stringify(subscriptionResponse)}`)
  } catch (e) {
    logger.error(e)
    const errorMessage = 'Failed to subscribe API to workspace. \nPlease check the logs for more information, then try re-installing the template again.'
    throw new Error(errorMessage)
  }
}

module.exports = {
  configureAPIs
}
