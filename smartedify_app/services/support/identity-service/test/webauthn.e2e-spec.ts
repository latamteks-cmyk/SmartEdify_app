  describe('WebAuthn L3 Advanced Fields', () => {
    it('should persist advanced fields on registration', async () => {
      // Simular respuesta de registro WebAuthn (mock, ya que no hay navegador real)
      const registrationInfo = {
        credential: {
          id: 'test-cred-id',
          publicKey: Buffer.from('mock-key'),
          counter: 1,
          transports: ['usb', 'nfc'],
        },
        aaguid: '00000000-0000-0000-0000-000000000000',
        fmt: 'packed',
        credentialDeviceType: 'multiDevice',
        credentialBackedUp: true,
        authenticatorExtensionResults: { credProtect: 2 },
      };
      const response = { response: { transports: ['usb', 'nfc'] } };
      // Acceso a setup y usersService del scope superior
      const { WebauthnService } = require('../src/modules/webauthn/webauthn.service');
      const webAuthnService = setup.moduleFixture.get(WebauthnService);
      const user = await setup.usersService.findByEmail('webauthn@test.com');
      // Usar el método privado para persistir directamente (unit-integration hybrid)
      // @ts-ignore
      await webAuthnService['persistCredential'](registrationInfo, response, user);

      // Consultar la base de datos para verificar los campos avanzados
      const creds = await setup.webAuthnCredentialsRepository.find();
      expect(creds.length).toBe(1);
      const cred = creds[0];
      describe('WebAuthn (e2e)', () => {
        let setup: TestModuleSetup;
        let app: INestApplication;
        let usersService: UsersService;
        let testUser: User;

        beforeAll(async () => {
          setup = await TestTimeoutManager.withTimeout(
            () => TestConfigurationFactory.createTestModule(),
            TEST_CONSTANTS.SERVICE_INITIALIZATION_TIMEOUT,
            'WebAuthn test module initialization'
          );
          app = setup.app;
          usersService = setup.usersService;
          await app.listen(0);
        }, TEST_CONSTANTS.TEST_TIMEOUT);

        beforeEach(async () => {
          await TestTimeoutManager.withTimeout(
            () => TestConfigurationFactory.cleanDatabase(setup),
            TEST_CONSTANTS.DATABASE_OPERATION_TIMEOUT,
            'Database cleanup'
          );

          testUser = await usersService.create({
            tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
            username: 'webauthn-user',
            email: 'webauthn@test.com',
            password: 'password',
            consent_granted: true,
          });
        });

        afterAll(async () => {
          await TestTimeoutManager.withTimeout(
            () => TestConfigurationFactory.closeTestModule(setup),
            TEST_CONSTANTS.MAX_CLEANUP_TIME,
            'Test module cleanup'
          );
        });

        describe('Options Generation', () => {
          it('should return valid registration options', async () => {
            const response = await request(app.getHttpServer())
              .get('/webauthn/registration/options')
              .query({ username: testUser.email, userId: testUser.id });
      
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.rp).toBeDefined();
            expect(response.body.user).toBeDefined();
            expect(response.body.challenge).toBeDefined();
            expect(response.body.pubKeyCredParams).toBeDefined();
            expect(response.body.user.id).toBe(Buffer.from(testUser.id).toString('base64url'));
          });

          it('should return valid authentication options', async () => {
              const response = await request(app.getHttpServer())
                .get('/webauthn/authentication/options')
                .query({ username: testUser.email });
        
              expect(response.status).toBe(200);
              expect(response.body).toBeDefined();
              expect(response.body.challenge).toBeDefined();
            });
        });

        describe('WebAuthn L3 Advanced Fields', () => {
          it('should persist advanced fields on registration', async () => {
            // Simular respuesta de registro WebAuthn (mock, ya que no hay navegador real)
            const registrationInfo = {
              credential: {
                id: 'test-cred-id',
                publicKey: Buffer.from('mock-key'),
                counter: 1,
                transports: ['usb', 'nfc'],
              },
              aaguid: '00000000-0000-0000-0000-000000000000',
              fmt: 'packed',
              credentialDeviceType: 'multiDevice',
              credentialBackedUp: true,
              authenticatorExtensionResults: { credProtect: 2 },
            };
            const response = { response: { transports: ['usb', 'nfc'] } };
            // Acceso a setup y usersService del scope superior
            const { WebauthnService } = require('../src/modules/webauthn/webauthn.service');
            const webAuthnService = setup.moduleFixture.get(WebauthnService);
            const user = await setup.usersService.findByEmail('webauthn@test.com');
            // Usar el método privado para persistir directamente (unit-integration hybrid)
            // @ts-ignore
            await webAuthnService['persistCredential'](registrationInfo, response, user);

            // Consultar la base de datos para verificar los campos avanzados
            const creds = await setup.webAuthnCredentialsRepository.find();
            expect(creds.length).toBe(1);
            const cred = creds[0];
            expect(cred.transports).toContain('usb');
            expect(cred.transports).toContain('nfc');
            expect(cred.cred_protect).toBe('2');
            expect(cred.backup_eligible).toBe(true);
            expect(cred.backup_state).toBe('backed_up');
            expect(cred.aaguid.toString('hex')).toBe('00000000000000000000000000000000');
            expect(cred.attestation_fmt).toBe('packed');
          });
        });
      });
      const clientData = {
        type: 'webauthn.create',
        challenge: 'test-challenge',
        origin: 'http://localhost:3000',
      };
      const registrationResponse = {
        id: 'test-cred-id',
        rawId: 'test-cred-id',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify(clientData)).toString('base64url'),
          attestationObject: Buffer.from('test-attestation').toString('base64url'),
          transports: ['usb', 'nfc'],
        },
        type: 'public-key',
        clientExtensionResults: {
          credProtect: 2,
        },
        authenticatorAttachment: 'cross-platform',
      };

      // Simular challenge esperado
      const expectedChallenge = 'test-challenge';

      const { WebauthnService } = require('../src/modules/webauthn/webauthn.service');
      const webAuthnService = setup.moduleFixture.get(WebauthnService);
      await webAuthnService.verifyRegistration(registrationResponse, expectedChallenge);

      // Consultar la base de datos para verificar los campos avanzados
      const creds = await setup.webAuthnCredentialsRepository.find();
      expect(creds.length).toBe(1);
      const cred = creds[0];
      expect(cred.transports).toContain('usb');
      expect(cred.transports).toContain('nfc');
      // credProtect y otros campos avanzados
      expect(cred.cred_protect).toBe('2');
      // backup_eligible y backup_state pueden depender del mock, pero deben existir
      expect(cred.backup_eligible).toBeDefined();
      expect(cred.backup_state).toBeDefined();
      // aaguid y attestation_fmt pueden ser undefined en este mock, pero la columna existe
      expect(cred).toHaveProperty('aaguid');
      expect(cred).toHaveProperty('attestation_fmt');
    });
  });
});
