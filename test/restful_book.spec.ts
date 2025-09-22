import pactum from 'pactum';
import { StatusCodes } from 'http-status-codes';
import { SimpleReporter } from '../simple-reporter';

describe('Restful-booker API - Teste de Autenticação', () => {
  const p = pactum;
  const rep = SimpleReporter;
  const baseUrl = 'https://restful-booker.herokuapp.com';

  p.request.setDefaultTimeout(30000);

  beforeAll(() => {
  p.reporter.add(rep);
   });

  afterAll(() => {
  p.reporter.end();
  });

  it('Deve obter um token de autenticação com sucesso', async () => {
    await p
    .spec()
    .post(`${baseUrl}/auth`)
    .withHeaders('Content-Type', 'application/json')
    .withJson({
        // Credenciais padrão conforme a documentação [1]
        username: 'admin',
        password: 'password123',
      })
    .expectStatus(StatusCodes.OK)
    .expectJsonSchema({
        type: 'object',
        properties: {
          token: { type: 'string' },
        },
        required: ['token'],
      })
    .stores('authToken', 'token'); // Armazena o token para uso futuro, se necessário
  });
});