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

const Ajv = require('ajv')
const fs = require('fs-extra')
const hjson = require('hjson')
const path = require('path')
const yaml = require('js-yaml')
const betterAjvErrors = require('better-ajv-errors').default

/**
 * Validate the config json
 * @param {object} configJson the json to validate
 * @param {boolean} pretty return prettified errors
 * @returns {object} object with properties `valid`, `configuration` and `errors`
 */
function validate (configJson, pretty = false) {
  /* eslint-disable-next-line node/no-unpublished-require */
  const schema = require('../../schema/template.schema.json')
  const ajv = new Ajv({ allErrors: true })

  // Load all sub-schemas
  const subSchemasPath = path.resolve(__dirname, '../../schema/sub-schemas')
  const subSchemas = fs.readdirSync(subSchemasPath).filter(file => file.endsWith('.schema.json'))
  subSchemas.forEach(schema => {
    const schemaData = require(subSchemasPath + '/' + schema)
    ajv.addSchema(schemaData)
  })

  const validate = ajv.compile(schema)

  return { valid: validate(configJson), configuration: configJson, errors: pretty ? betterAjvErrors(schema, configJson, validate.errors, { format: 'js' }) : validate.errors }
}

/**
 * Load a config file
 * @param {string} fileOrBuffer the path to the config file or a Buffer
 * @returns {object} object with properties `value` and `format`
 */
function load (fileOrBuffer) {
  let contents
  if (typeof fileOrBuffer === 'string') {
    contents = fs.readFileSync(fileOrBuffer, 'utf-8')
  } else if (Buffer.isBuffer(fileOrBuffer)) {
    contents = fileOrBuffer.toString('utf-8')
  } else {
    contents = ''
  }

  contents = contents.trim()

  if (contents) {
    if (contents[0] === '{') {
      try {
        return { values: hjson.parse(contents), format: 'json' }
      } catch (e) {
        throw new Error('Cannot parse json')
      }
    } else {
      try {
        return { values: yaml.load(contents, { json: true }), format: 'yaml' }
      } catch (e) {
        throw new Error('Cannot parse yaml')
      }
    }
  }
  return { values: {}, format: 'json' }
}

/**
 * Returns services required by a template.
 * For example:
 * { runtime: true, apis: [{ code: 'GraphQLServiceSDK' }, { code: 'AssetComputeSDK' }] }
 * @param {string} templateConfigurationFile a path to the config file
 * @returns {object} an object with properties `runtime` and `apis`
 */
function getTemplateRequiredServices (templateConfigurationFile) {
  const data = load(templateConfigurationFile).values
  // default values
  const info = {
    runtime: false,
    apis: []
  }
  if (Object.prototype.hasOwnProperty.call(data, 'runtime')) {
    info.runtime = data.runtime
  }
  if (Object.prototype.hasOwnProperty.call(data, 'apis')) {
    info.apis = data.apis
  }
  return info
}

module.exports = {
  load,
  validate,
  getTemplateRequiredServices
}
