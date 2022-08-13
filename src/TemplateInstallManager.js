/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { CoreConsoleAPI } = require('@adobe/aio-lib-console')
const cert = require('@adobe/aio-cli-plugin-certificate')
const loggerNamespace = '@adobe/aio-lib-console-project-installation'
const logger = require('@adobe/aio-lib-core-logging')(loggerNamespace, { level: process.env.LOG_LEVEL })
const fs = require('fs')
const tmp = require('tmp')

const SERVICE_TYPE_ENTERPRISE = 'entp'
const SERVICE_TYPE_ADOBEID = 'adobeid'
const SERVICE_TYPE_ANALYTICS = 'analytics'

/**
 * This class provides methods to configure Adobe Developer Console Projects from a configuration file.
 */
class TemplateInstallManager {
  /**
   * Initializes an TemplateInstallManager object.
   *
   * @param {CoreConsoleAPI} consoleClient The Adobe Console API client.
   * @param {object} configuration The template configuration object in JSON format. See the template.schema.json file for the schema.
   */
  constructor (consoleClient, configuration) {
    this.sdkClient = consoleClient
    this.configuration = configuration
    logger.debug(`template configuration: ${JSON.stringify(this.configuration)}`)
  }

  /**
   * Installs the template.
   *
   * @param {string} orgId The ID of the organization the project exists in.
   * @param {string} projectId The ID of the project to install the template to.
   * @returns {Promise<void>} A promise that resolves when the template is installed.
   * @throws {Error} If the template could not be installed.
   */
  async installTemplate (orgId, projectId) {
    // Configure workspaces.
    const runtime = this.configuration.runtime === undefined ? false : this.configuration.runtime
    const workspaces = this.configuration.workspaces
    if (workspaces) {
      await this.configureWorkspaces(orgId, projectId, runtime, workspaces)
    } else {
      await this.configureWorkspaces(orgId, projectId, runtime)
    }

    const apis = this.configuration.apis
    if (apis) {
      await this.configureAPIs(orgId, projectId, apis)
    }
  }

  /**
   * Configure workspaces for the template.
   *
   * List of the Workspace names required to be created in the App Builder Project,
   * if they don't exist.
   *
   * Runtime namespaces are added by default for each workspace,
   * if the runtime key is set to true (all or nothing).
   *
   * If Staging and Production workspaces are not listed as workspaces,
   * they are implied.
   *
   * @private
   * @param {string} orgId The ID of the organization the project exists in.
   * @param {string} projectId The ID of the project to install the template to.
   * @param {boolean} runtimeEnabled Whether to add runtime namespaces to all workspaces.
   * @param {Array<string>} workspaces The workspaces to configure.
   */
  async configureWorkspaces (orgId, projectId, runtimeEnabled, workspaces = ['Stage', 'Production']) {
    // If not declared, 'Stage' and 'Production' workspaces are implied.
    if (!workspaces.includes('Stage')) {
      workspaces.push('Stage')
    }

    if (!workspaces.includes('Production')) {
      workspaces.push('Production')
    }

    // Get current workspaces for the project.
    const currentWorkspaces = (await this.sdkClient.getWorkspacesForProject(orgId, projectId)).body
    // Check if workspaces exist.
    for (const configuredWorkspace of workspaces) {
      const workspaceIndex = currentWorkspaces.findIndex(currentWorkspace => currentWorkspace.name === configuredWorkspace)
      const workspaceExists = workspaceIndex !== -1
      if (workspaceExists) {
        // Workspace exists, check if runtime namespaces are configured.
        const runtimeConfigured = currentWorkspaces[workspaceIndex].runtime_enabled === 1
        if (runtimeEnabled && !runtimeConfigured) {
          // Runtime namespaces are not configured, configure them.
          const workspaceId = currentWorkspaces[workspaceIndex].id
          await this.sdkClient.createRuntimeNamespace(orgId, projectId, workspaceId)
        }
      } else {
        // Add new workspaces if they don't exist.
        const name = configuredWorkspace
        const title = configuredWorkspace + ' workspace'
        const createdWorkspace = (await this.sdkClient.createWorkspace(orgId, projectId, { name, title })).body

        if (runtimeEnabled) {
          const workspaceId = createdWorkspace.workspaceId
          await this.sdkClient.createRuntimeNamespace(orgId, projectId, workspaceId)
        }
      }
    }
  }

  /**
   * Configure APIs required for the template.
   *
   * @private
   * @param {string} orgId The ID of the organization the project exists in.
   * @param {string} projectId The ID of the project to configure the APIs for.
   * @param {Array<object>} apis The APIs to configure used by the template.
   */
  async configureAPIs (orgId, projectId, apis) {
    logger.debug(`apis to configure: ${JSON.stringify(apis)}`)
    const orgServices = (await this.sdkClient.getServicesForOrg(orgId)).body
    const currentWorkspaces = (await this.sdkClient.getWorkspacesForProject(orgId, projectId)).body
    for (const workspace of currentWorkspaces) {
      const workspaceId = workspace.id

      for (const api of apis) {
        const service = orgServices.find(service => service.code === api.code)
        if (service && service.enabled === true) {
          const serviceType = service.type
          switch (serviceType) {
            case SERVICE_TYPE_ENTERPRISE: {
              await this.onboardEnterpriseApi(orgId, projectId, workspaceId, service)
              break
            }
            case SERVICE_TYPE_ADOBEID: {
              await this.onboardAdobeIdApi(orgId, projectId, workspaceId, service)
              break
            }
            case SERVICE_TYPE_ANALYTICS: {
              await this.onboardAnalyticsApi(orgId, projectId, workspaceId, service)
              break
            }
            default: {
              const errorMessage = `Unsupported service type, "${serviceType}". Supported service types are: ${[SERVICE_TYPE_ENTERPRISE, SERVICE_TYPE_ADOBEID, SERVICE_TYPE_ANALYTICS].join(',')}.`
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
    }
  }

  /**
   * Onboards an Enterprise API to the workspace.
   *
   * @private
   * @param {string} orgId The ID of the organization the project exists in.
   * @param {string} projectId The ID of the project to configure the APIs for.
   * @param {string} workspaceId The ID of the workspace to configure the APIs for.
   * @param {object} service The service info.
   * @returns {Promise<void>} A promise that resolves when the Enterprise API is onboarded.
   */
  async onboardEnterpriseApi (orgId, projectId, workspaceId, service) {
    const credentialType = 'entp'
    const credentialId = await this.getWorkspaceEnterpriseCredentials(orgId, projectId, workspaceId, credentialType)
    const serviceInfo = this.getServiceInfo(service)
    await this.subscribeAPI(orgId, projectId, workspaceId, credentialType, credentialId, serviceInfo)
  }

  /**
   * Onboards an AdobeId API to the workspace.
   *
   * @private
   * @param {string} orgId The ID of the organization the project exists in.
   * @param {string} projectId The ID of the project to configure the APIs for.
   * @param {string} workspaceId The ID of the workspace to configure the APIs for.
   * @param {object} service The service info.
   * @returns {Promise<void>} A promise that resolves when the AdobeId API is onboarded.
   */
  async onboardAdobeIdApi (orgId, projectId, workspaceId, service) {
  }

  /**
   * Onboards an Analytics API to the workspace.
   *
   * @private
   * @param {string} orgId The ID of the organization the project exists in.
   * @param {string} projectId The ID of the project to configure the APIs for.
   * @param {string} workspaceId The ID of the workspace to configure the APIs for.
   * @param {object} service The service info.
   * @returns {Promise<void>} A promise that resolves when the Analytics API is onboarded.
   */
  async onboardAnalyticsApi (orgId, projectId, workspaceId, service) {
  }

  /**
   * Get enterprise credentials for the workspace.
   *
   * @private
   * @param {string} orgId The ID of the organization the project exists in.
   * @param {string} projectId The ID of the project to configure the APIs for.
   * @param {string} workspaceId The ID of the workspace to get the credentials for.
   * @param {string} credentialType The type of credential to get. Defaults to 'entp'.
   * @returns {string} The credential ID.
   * @throws {Error} If the credentials cannot be retrieved.
   */
  async getWorkspaceEnterpriseCredentials (orgId, projectId, workspaceId, credentialType) {
    const credentials = (await this.sdkClient.getCredentials(orgId, projectId, workspaceId)).body
    const credential = credentials.find(c => c.flow_type === credentialType && c.integration_type === 'service')
    let credentialId = credential && credential.id_integration
    if (!credentialId) {
      const keyPair = cert.generate('aio-lib-console-e2e', 365, { country: 'US', state: 'CA', locality: 'SF', organization: 'Adobe', unit: 'AdobeIO' })
      const certFile = tmp.fileSync({ postfix: '.crt' })
      fs.writeFileSync(certFile.fd, keyPair.cert)
      const ts = new Date().getTime()
      const credentialNameEntp = 'cred-entp' + ts
      const credential = (await this.sdkClient.createEnterpriseCredential(orgId, projectId, workspaceId, fs.createReadStream(certFile.name), credentialNameEntp, 'Enterprise Credential')).body
      credentialId = credential.id
    }

    return credentialId
  }

  /**
   * Get Service Info for the Organization.
   *
   * @private
   * @param {object} service The service to get the info for.
   * @returns {object} The service info.
   */
  getServiceInfo (service) {
    const serviceProperties = [{
      name: service.name,
      sdkCode: service.code,
      roles: (service.properties && service.properties.roles) || null,
      licenseConfigs: (service.properties && service.properties.licenseConfigs) || null
    }]
    const serviceInfo = serviceProperties.map(sp => {
      return {
        sdkCode: sp.sdkCode,
        roles: sp.roles,
        licenseConfigs: (sp.licenseConfigs || null) && sp.licenseConfigs.map(l => ({
          op: 'add',
          id: l.id,
          productId: l.productId
        }))
      }
    })
    logger.debug(`service info: ${JSON.stringify(serviceInfo)}`)
    return serviceInfo
  }

  /**
   * Subscribe an API to a workspace.
   *
   * @private
   * @param {string} orgId The ID of the organization the project exists in.
   * @param {string} projectId The ID of the project to configure the APIs for.
   * @param {string} workspaceId The ID of the workspace to subscribe the API to.
   * @param {string} credentialType The type of credential to get. Defaults to 'entp'.
   * @param {string} credentialId The ID of the credential to use.
   * @param  {Map} serviceInfo The service info to use.
   */
  async subscribeAPI (orgId, projectId, workspaceId, credentialType, credentialId, serviceInfo) {
    try {
      const subscriptionResponse = (await this.sdkClient.subscribeCredentialToServices(
        orgId,
        projectId,
        workspaceId,
        credentialType,
        credentialId,
        serviceInfo
      )).body
      logger.debug(`subscription response: ${JSON.stringify(subscriptionResponse)}`)
    } catch (e) {
      logger.error(e)
      const errorMessage = 'Failed to subscribe API to workspace. \nPlease check the logs for more information, then try re-installing the template again.'
      throw new Error(errorMessage)
    }
  }
}

module.exports = TemplateInstallManager
