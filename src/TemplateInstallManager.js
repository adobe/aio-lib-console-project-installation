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
const loggerNamespace = '@adobe/aio-lib-console-project-installation'
const logger = require('@adobe/aio-lib-core-logging')(loggerNamespace, { provider: 'debug', level: process.env.LOG_LEVEL || 'debug' })
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
    console.log(configuration)
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

    return 'done'
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
  async configureWorkspaces (orgId, projectId, runtimeEnabled = false, workspaces = ['Stage', 'Production']) {
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
    console.log(apis)
  }
}

module.exports = TemplateInstallManager
