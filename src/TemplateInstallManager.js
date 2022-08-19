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
const yaml = require('js-yaml')

const SERVICE_TYPE_ENTERPRISE = 'entp'
const SERVICE_TYPE_ADOBEID = 'adobeid'

const SERVICE_INTEGRATION_TYPE_SERVICE = 'service'
const SERVICE_INTEGRATION_TYPE_APIKEY = 'apikey'

// supported platforms
const SERVICE_TYPE_ADOBEID_PLATFORM_APIKEY = 'apiKey'

/**
 * This class provides methods to configure Adobe Developer Console Projects from a configuration file.
 */
class TemplateInstallManager {
  /**
   * Initializes an TemplateInstallManager object.
   *
   * @param {CoreConsoleAPI} consoleClient The Adobe Console API client.
   * @param {string} appConfigurationFile The path to the 'app.config.yaml' configuration file.
   * @param {string} templateName The name of the template's NPM module.
   * @param {object} templateConfiguration The template configuration object in JSON format. See the template.schema.json file for the schema.
   */
  constructor (consoleClient, appConfigurationFile, templateName, templateConfiguration) {
    this.sdkClient = consoleClient
    this.appConfigurationFile = appConfigurationFile
    this.templateName = templateName
    this.templateConfiguration = templateConfiguration
    logger.debug(`Installing template: ${JSON.stringify(this.templateName)}`)
    logger.debug(`Template configuration: ${JSON.stringify(this.templateConfiguration)}`)
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
    const runtime = this.templateConfiguration.runtime === undefined ? false : this.templateConfiguration.runtime
    const workspaces = this.templateConfiguration.workspaces
    if (workspaces) {
      await this.configureWorkspaces(orgId, projectId, runtime, workspaces)
    } else {
      await this.configureWorkspaces(orgId, projectId, runtime)
    }

    const apis = this.templateConfiguration.apis
    if (apis) {
      await this.configureAPIs(orgId, projectId, apis)
    }

    const hooks = this.templateConfiguration.hooks
    if (hooks) {
      await this.configureHooks(hooks)
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
            default: {
              const errorMessage = `Unsupported service type, "${serviceType}". Supported service types are: ${[SERVICE_TYPE_ENTERPRISE, SERVICE_TYPE_ADOBEID].join(',')}.`
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
   * Configure hooks required for the template.
   *
   * @private
   * @param {Array<string>} hooks The hooks to configure used by the template.
   */
  async configureHooks (hooks) {
    // Open app.config.yaml file.
    let appConfigObj = {}
    try {
      logger.info('Reading app.config.yaml file.')
      logger.debug('app.config.yaml file path: ' + this.appConfigurationFile)
      const fileContents = fs.readFileSync(this.appConfigurationFile, 'utf8')
      appConfigObj = yaml.load(fileContents)
      logger.debug(`app.config.yaml file contents: ${JSON.stringify(appConfigObj)}.`)

      // Add the template-hooks key to the app.config.yaml file if it doesn't exist.
      logger.info('Adding template-hooks configuration to app.config.yaml file.')
      if (!appConfigObj['template-hooks']) {
        appConfigObj['template-hooks'] = {}
      }

      // Add the hooks to the template-hooks key.
      hooks.forEach(hook => {
        if (!appConfigObj['template-hooks'][hook]) {
          appConfigObj['template-hooks'][hook] = [this.templateName]
        } else if (!appConfigObj['template-hooks'][hook].includes(this.templateName)) {
          appConfigObj['template-hooks'][hook].push(this.templateName)
        }
      })

      // Write changes to the app.config.yaml file.
      logger.debug(`Writing app.config.yaml file: ${JSON.stringify(appConfigObj)}`)
      fs.writeFileSync(this.appConfigurationFile, yaml.dump(appConfigObj), 'utf8')
    } catch (e) {
      const errorMessage = `There was an unexpected error configuring hooks for template ${JSON.stringify(this.templateName)}.`
      logger.error(errorMessage)
      throw new Error(e)
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
    const credentialType = SERVICE_TYPE_ENTERPRISE
    const credentialId = await this.getWorkspaceEnterpriseCredentials(orgId, projectId, workspaceId)
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
    const credentialType = SERVICE_TYPE_ADOBEID
    const credentialId = await this.getWorkspaceAdobeIdCredentials(orgId, projectId, workspaceId)
    const serviceInfo = this.getServiceInfo(service)
    await this.subscribeAPI(orgId, projectId, workspaceId, credentialType, credentialId, serviceInfo)
  }

  /**
   * Get enterprise credentials for the workspace.
   *
   * @private
   * @param {string} orgId The ID of the organization the project exists in.
   * @param {string} projectId The ID of the project to configure the APIs for.
   * @param {string} workspaceId The ID of the workspace to get the credentials for.
   * @returns {string} The credential ID.
   * @throws {Error} If the credentials cannot be retrieved.
   */
  async getWorkspaceEnterpriseCredentials (orgId, projectId, workspaceId) {
    const credentials = (await this.sdkClient.getCredentials(orgId, projectId, workspaceId)).body
    const credential = credentials.find(c => c.flow_type === SERVICE_TYPE_ENTERPRISE && c.integration_type === SERVICE_INTEGRATION_TYPE_SERVICE)
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
   * Get adobeid credentials for the workspace.
   *
   * @private
   * @param {string} orgId The ID of the organization the project exists in.
   * @param {string} projectId The ID of the project to configure the APIs for.
   * @param {string} workspaceId The ID of the workspace to get the credentials for.
   * @returns {string} The credential ID.
   * @throws {Error} If the credentials cannot be retrieved.
   */
  async getWorkspaceAdobeIdCredentials (orgId, projectId, workspaceId) {
    const credentials = (await this.sdkClient.getCredentials(orgId, projectId, workspaceId)).body
    const credential = credentials.find(c => c.flow_type === SERVICE_TYPE_ADOBEID && c.integration_type === SERVICE_INTEGRATION_TYPE_APIKEY)
    let credentialId = credential && credential.id_integration
    if (!credentialId) {
      const ts = new Date().getTime()
      // though "redirectUriList" and "defaultRedirectUri" are not needed for the AdobeID APIKEY authorisation mechanism, it is better to provide them to avoid any possible validation issues on the Console side
      const redirectUriList = ['https://adobe.com']
      const defaultRedirectUri = 'https://adobe.com'
      const adobeIdCredential = (await this.sdkClient.createAdobeIdCredential(orgId, projectId, workspaceId, { name: `AdobeId Credentials ${ts}`, description: 'AdobeId Credentials', platform: SERVICE_TYPE_ADOBEID_PLATFORM_APIKEY, redirectUriList, defaultRedirectUri })).body
      credentialId = adobeIdCredential.id
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
