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

const fs = require('fs')
const sdk = require('@adobe/aio-lib-console')
const env = require('@adobe/aio-lib-env')
const logger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-console-project-installation:index', { level: process.env.LOG_LEVEL })
const TemplateInstallManager = require('./TemplateInstallManager.js')
const configurationHandler = require('./lib/configuration-handler')
const { configureAPIs } = require('./lib/configure-apis')

/**
 * Returns a new TemplateInstallManager object.
 * @param {string} accessToken The Adobe Console API client.
 * @param {string} templateConfigurationFile The path to the configuration file.
 * @returns {TemplateInstallManager} A new TemplateInstallManager object.
 */
async function init (accessToken, templateConfigurationFile) {
  logger.debug('Initializing a new TemplateInstallManager object.')

  // Initialize the Console SDK
  const apiKey = env.getCliEnv() === 'prod' ? 'aio-cli-console-auth' : 'aio-cli-console-auth-stage'
  const consoleClient = await sdk.init(accessToken, apiKey)

  // Check if the configuration file exists
  try {
    const fileStats = fs.statSync(templateConfigurationFile)
    if (!fileStats.isFile()) {
      throw new Error(`The configuration file ${templateConfigurationFile} does not exist.`)
    }
  } catch (error) {
    throw new Error(`The configuration file path ${templateConfigurationFile} is not a valid file.`)
  }

  // Load and validate the configuration file
  const { valid: configIsValid, configuration, errors: configErrors } = await validate(templateConfigurationFile, false)
  if (!configIsValid) {
    const message = `Missing or invalid keys in config: ${JSON.stringify(configErrors, null, 2)}`
    throw new Error(message)
  }
  return new TemplateInstallManager(consoleClient, configuration)
}

/**
 * @param {string} templateConfigurationFile The path to the configuration file.
 * @param {boolean} pretty Prettify errors.
 * @returns {object} Object with properties `valid`, `configuration` and `errors`
 */
async function validate (templateConfigurationFile, pretty = false) {
  const configurationObject = configurationHandler.load(templateConfigurationFile)
  return configurationHandler.validate(configurationObject.values, pretty)
}

module.exports = {
  init,
  validate,
  getTemplateRequiredServices: configurationHandler.getTemplateRequiredServices,
  configureAPIs
}
