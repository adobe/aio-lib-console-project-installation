const { configureAPIs } = require('../../src/lib/configure-apis')
const dataMocks = require('../data-mocks')

// console sdk mock setup
jest.mock('@adobe/aio-lib-console')
const consoleSDK = require('@adobe/aio-lib-console')
const mockConsoleSDKInstance = {
  getWorkspacesForProject: jest.fn(),
  getServicesForOrg: jest.fn(),
  subscribeCredentialToServices: jest.fn(),
  getSDKProperties: jest.fn(),
  getIntegration: jest.fn(),
  createOAuthServerToServerCredential: jest.fn(),
  createAdobeIdCredential: jest.fn(),
  getCredentials: jest.fn()
}
consoleSDK.init.mockResolvedValue(mockConsoleSDKInstance)

beforeEach(async () => {
  jest.clearAllMocks()
  // Mock sdk calls
  mockConsoleSDKInstance.getWorkspacesForProject.mockResolvedValue({ body: [dataMocks.workspaces[0]] })
  mockConsoleSDKInstance.getServicesForOrg.mockResolvedValue({ body: dataMocks.services })
  mockConsoleSDKInstance.getCredentials.mockResolvedValue({ body: dataMocks.integrations })
  mockConsoleSDKInstance.createOAuthServerToServerCredential.mockResolvedValue({ body: dataMocks.integrationCreateResponse })
  mockConsoleSDKInstance.createAdobeIdCredential.mockResolvedValue({ body: dataMocks.integrationCreateResponse })
  mockConsoleSDKInstance.subscribeCredentialToServices.mockResolvedValue({ body: dataMocks.subscribeServicesResponse })
})

describe('configureAPIs', () => {
  test('configures apis with product profile filter', async () => {
    const consoleClient = await consoleSDK.init()
    const apis = [
      {
        code: 'AssetComputeSDK'
      }
    ]
    const productProfiles = [
      {
        sdkCode: 'AssetComputeSDK',
        licenseConfigs: [
          {
            id: '0123456',
            name: 'config',
            productId: 'AAAAACCCCCCVV2EEEEE1E'
          }
        ]
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis,
      productProfiles
    })

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      dataMocks.integration.type,
      dataMocks.integration.id,
      expect.arrayContaining([
        expect.objectContaining({
          sdkCode: 'AssetComputeSDK',
          licenseConfigs: [{ id: '0123456', op: 'add', productId: 'AAAAACCCCCCVV2EEEEE1E' }]
        })
      ])
    )
  })

  test('product profile filter for one sdk doesnt effect another', async () => {
    const consoleClient = await consoleSDK.init()
    const apis = [
      {
        code: 'AssetComputeSDK'
      },
      {
        code: 'secondSDK'
      }
    ]
    const productProfiles = [
      {
        sdkCode: 'AssetComputeSDK',
        licenseConfigs: [
          {
            id: '0123456',
            name: 'config',
            productId: 'AAAAACCCCCCVV2EEEEE1E'
          }
        ]
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis,
      productProfiles
    })

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      dataMocks.integration.type,
      dataMocks.integration.id,
      expect.arrayContaining([
        expect.objectContaining({
          sdkCode: 'secondSDK',
          licenseConfigs: [
            {
              id: '1234567',
              productId: 'AAAAABBBBBVV2VVEEE1E',
              op: 'add'
            },
            {
              id: '7654321',
              productId: 'AAAAABBBBBVV2VVEEE1E',
              op: 'add'
            }
          ]
        })
      ])
    )
  })

  test('configures apis for sdks with no existing product profiles', async () => {
    const consoleClient = await consoleSDK.init()
    const apis = [
      {
        code: 'thirdSDK'
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis
    })

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      dataMocks.integration.type,
      dataMocks.integration.id,
      expect.arrayContaining([
        expect.objectContaining({
          sdkCode: 'thirdSDK',
          licenseConfigs: null
        })
      ])
    )
  })

  test('product profile filter for irrelevant api gets ignored', async () => {
    const consoleClient = await consoleSDK.init()
    const apis = [
      {
        code: 'thirdSDK'
      }
    ]
    const productProfiles = [
      {
        sdkCode: 'AssetComputeSDK',
        licenseConfigs: [
          {
            id: '0123456',
            name: 'config',
            productId: 'AAAAACCCCCCVV2EEEEE1E'
          }
        ]
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis,
      productProfiles
    })

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      dataMocks.integration.type,
      dataMocks.integration.id,
      expect.arrayContaining([
        expect.objectContaining({
          sdkCode: 'thirdSDK',
          licenseConfigs: null
        })
      ])
    )
  })

  test('configures apis for multiple services with different credential types', async () => {
    const consoleClient = await consoleSDK.init()
    const apis = [
      {
        code: 'seventhSDK'
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis
    })

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      dataMocks.integration.type,
      dataMocks.integration.id,
      expect.arrayContaining([
        expect.objectContaining({
          sdkCode: 'seventhSDK',
          licenseConfigs: null
        })
      ])
    )
  })

  test('uses OAuth credential type when OAuth credential exists', async () => {
    const consoleClient = await consoleSDK.init()
    // Mock credentials to return OAuth credential
    mockConsoleSDKInstance.getCredentials.mockResolvedValue({ body: dataMocks.integrationsOAuthAndJwt })

    const apis = [
      {
        code: 'AssetComputeSDK'
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis
    })

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      'oauth_server_to_server', // Should use OAuth credential type
      '111111', // OAuth credential ID
      expect.any(Array)
    )
  })

  test('uses JWT credential type when only JWT credential exists', async () => {
    const consoleClient = await consoleSDK.init()
    // Mock credentials to return only JWT credential (no OAuth)
    const jwtOnlyCredentials = [
      {
        id_integration: '33333',
        id_workspace: dataMocks.workspace.id,
        integration_type: 'service',
        flow_type: 'entp'
      }
    ]
    mockConsoleSDKInstance.getCredentials.mockResolvedValue({ body: jwtOnlyCredentials })

    const apis = [
      {
        code: 'AssetComputeSDK'
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis
    })

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      'entp', // Should use JWT credential type
      '33333', // JWT credential ID
      expect.any(Array)
    )
  })

  test('does not crash when productProfilesFilter targets a service whose org definition has properties: null', async () => {
    const consoleClient = await consoleSDK.init()
    // thirdSDK has properties: null in the mock services catalog
    const apis = [{ code: 'thirdSDK' }]
    const productProfiles = [
      {
        sdkCode: 'thirdSDK',
        licenseConfigs: [{ id: '9999999', name: 'some config', productId: 'ZZZZZ' }]
      }
    ]

    await expect(
      configureAPIs({
        consoleClient,
        orgId: dataMocks.project.org_id,
        projectId: dataMocks.project.id,
        apis,
        productProfiles
      })
    ).resolves.not.toBeDefined()

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      dataMocks.integration.type,
      dataMocks.integration.id,
      expect.arrayContaining([
        expect.objectContaining({ sdkCode: 'thirdSDK', licenseConfigs: null })
      ])
    )
  })

  test('enterprise path selects the entp row when a service code appears under both adobeid and entp in the org catalog', async () => {
    const consoleClient = await consoleSDK.init()

    // Catalog where dualTypeSDK appears as adobeid first (properties: null) and entp second (has licenseConfigs).
    // Without the type-scoped find, the adobeid row would be selected and the licenseConfigs would be lost.
    const dualTypeCatalog = [
      {
        name: 'Dual Type SDK',
        code: 'dualTypeSDK',
        enabled: true,
        type: 'adobeid',
        properties: null,
        requiresApproval: false
      },
      {
        name: 'Dual Type SDK',
        code: 'dualTypeSDK',
        enabled: true,
        type: 'entp',
        properties: {
          roles: null,
          licenseConfigs: [{ id: '1111111', name: 'entp config', productId: 'ENTP_PRODUCT', description: null }]
        },
        requiresApproval: false
      }
    ]
    mockConsoleSDKInstance.getServicesForOrg.mockResolvedValue({ body: dualTypeCatalog })

    const apis = [{ code: 'dualTypeSDK' }]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis
    })

    // The entp row carries licenseConfigs — the subscription must include them.
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      dataMocks.integration.type,
      dataMocks.integration.id,
      expect.arrayContaining([
        expect.objectContaining({
          sdkCode: 'dualTypeSDK',
          licenseConfigs: [{ op: 'add', id: '1111111', productId: 'ENTP_PRODUCT' }]
        })
      ])
    )
  })

  test('does not crash when productProfilesFilter contains a service code absent from the org catalog', async () => {
    const consoleClient = await consoleSDK.init()
    const apis = [{ code: 'AssetComputeSDK' }]
    const productProfiles = [
      {
        sdkCode: 'NonExistentSDK',
        licenseConfigs: [{ id: '0000000', name: 'ghost config', productId: 'GHOST' }]
      }
    ]

    await expect(
      configureAPIs({
        consoleClient,
        orgId: dataMocks.project.org_id,
        projectId: dataMocks.project.id,
        apis,
        productProfiles
      })
    ).resolves.not.toBeDefined()

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
  })

  test('skips optional API when service code is not found in the org', async () => {
    const consoleClient = await consoleSDK.init()
    const apis = [
      {
        code: 'AssetComputeSDK'
      },
      {
        code: 'NonExistentService',
        optional: true
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis
    })

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      dataMocks.integration.type,
      dataMocks.integration.id,
      expect.arrayContaining([
        expect.objectContaining({
          sdkCode: 'AssetComputeSDK'
        })
      ])
    )
  })

  test('still throws for required API when service code is not found in the org', async () => {
    const consoleClient = await consoleSDK.init()
    const apis = [
      {
        code: 'NonExistentService'
      }
    ]
    await expect(
      configureAPIs({
        consoleClient,
        orgId: dataMocks.project.org_id,
        projectId: dataMocks.project.id,
        apis
      })
    ).rejects.toThrow('Service code "NonExistentService"')
  })

  test('skips all APIs when all are optional and none are found', async () => {
    const consoleClient = await consoleSDK.init()
    const apis = [
      {
        code: 'NonExistentA',
        optional: true
      },
      {
        code: 'NonExistentB',
        optional: true
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis
    })

    expect(consoleClient.subscribeCredentialToServices).not.toHaveBeenCalled()
  })

  test('associates optional API when service code IS found in the org', async () => {
    const consoleClient = await consoleSDK.init()
    const apis = [
      {
        code: 'AssetComputeSDK',
        optional: true
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis
    })

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      dataMocks.integration.type,
      dataMocks.integration.id,
      expect.arrayContaining([
        expect.objectContaining({
          sdkCode: 'AssetComputeSDK'
        })
      ])
    )
  })

  test('creates OAuth credential and uses OAuth type when no credentials exist', async () => {
    const consoleClient = await consoleSDK.init()
    // Mock credentials to return empty array (no existing credentials)
    mockConsoleSDKInstance.getCredentials.mockResolvedValue({ body: [] })

    const apis = [
      {
        code: 'AssetComputeSDK'
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis
    })

    // Should create OAuth credential
    expect(consoleClient.createOAuthServerToServerCredential).toHaveBeenCalledTimes(1)

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      'oauth_server_to_server', // Should use OAuth credential type
      dataMocks.integrationCreateResponse.id, // Newly created credential ID
      expect.any(Array)
    )
  })
})
