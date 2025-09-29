import pactum from 'pactum';
import { StatusCodes } from 'http-status-codes';
import { SimpleReporter } from '../simple-reporter';
import { faker } from '@faker-js/faker';

describe('Restful-booker API - Teste de Autenticação', () => {
  const p = pactum;
  const rep = SimpleReporter;
  const baseUrl = 'https://restful-booker.herokuapp.com';

  p.request.setDefaultTimeout(60000);

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
        password: 'password123'
      })
      .expectStatus(StatusCodes.OK)
      .expectJsonSchema({
        type: 'object',
        properties: {
          token: { type: 'string' }
        },
        required: ['token']
      })
      .stores('authToken', 'token'); // Armazena o token para uso futuro
  });
  const bookingDetails = {
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    totalprice: faker.number.int({ min: 100, max: 1000 }),
    depositpaid: true,
    bookingdates: {
      checkin: '2024-09-01',
      checkout: '2024-09-15'
    },
    additionalneeds: 'Early check-in'
  };

  // Teste 1: Criar uma nova reserva
  it('Deve criar uma nova reserva com sucesso', async () => {
    await p
      .spec()
      .post(`${baseUrl}/booking`)
      .withHeaders('Accept', 'application/json')
      .withJson(bookingDetails)
      .expectStatus(StatusCodes.OK)
      .expectJsonLike('booking', bookingDetails)
      .stores('bookingId', 'bookingid'); // Armazena o ID da reserva
  });
  // Teste 2: Obter todos os IDs de reserva
  it('Deve obter uma lista de todos os IDs de reserva', async () => {
    await p
      .spec()
      .get(`${baseUrl}/booking`)
      .expectStatus(StatusCodes.OK)
      .expectJsonSchema({
        type: 'array',
        items: {
          type: 'object',
          properties: {
            bookingid: { type: 'number' }
          }
        }
      });
  });
  // Teste 3: Obter os detalhes da reserva criada
  it('Deve obter os detalhes de uma reserva específica pelo ID', async () => {
    await p
      .spec()
      .get(`${baseUrl}/booking/{id}`)
      .withPathParams('id', '$S{bookingId}') // Usa o ID armazenado
      .withHeaders('Accept', 'application/json')
      .expectStatus(StatusCodes.OK)
      .expectJsonLike(bookingDetails);
  });
  // Teste 4: Filtrar reservas pelo nome
  it('Deve retornar uma lista vazia ao filtrar por um nome inexistente', async () => {
    // Gera um nome único e aleatório que certamente não existe na API
    const nonExistentName = faker.string.uuid();

    await p
      .spec()
      .get(`${baseUrl}/booking`)
      .withQueryParams('firstname', nonExistentName)
      .expectStatus(StatusCodes.OK)
      // A asserção correta aqui é verificar se o tamanho do array da resposta é 0
      .expectJsonLength(0);
  });
  // Teste 5: Atualizar completamente uma reserva (PUT)
  it('Deve atualizar completamente uma reserva existente (PUT)', async () => {
    const updatedDetails = {
      ...bookingDetails,
      totalprice: 2000,
      additionalneeds: 'All inclusive'
    };
    await p
      .spec()
      .put(`${baseUrl}/booking/{id}`)
      .withPathParams('id', '$S{bookingId}')
      .withHeaders({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Cookie: 'token=$S{authToken}' // Usa o token armazenado
      })
      .withJson(updatedDetails)
      .expectStatus(StatusCodes.OK)
      .expectJsonLike(updatedDetails);
  });

  // Teste 6: Atualizar parcialmente uma reserva (PATCH)
  it('Deve atualizar parcialmente uma reserva existente (PATCH)', async () => {
    const partialUpdate = {
      firstname: 'NomeAtualizado',
      lastname: 'SobrenomeAtualizado'
    };
    await p
      .spec()
      .patch(`${baseUrl}/booking/{id}`)
      .withPathParams('id', '$S{bookingId}')
      .withHeaders({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Cookie: 'token=$S{authToken}'
      })
      .withJson(partialUpdate)
      .expectStatus(StatusCodes.OK)
      .expectJsonLike('firstname', partialUpdate.firstname)
      .expectJsonLike('lastname', partialUpdate.lastname);
  });

  // Teste 7: Deletar a reserva
  it('Deve deletar a reserva com sucesso', async () => {
    await p
      .spec()
      .delete(`${baseUrl}/booking/{id}`)
      .withPathParams('id', '$S{bookingId}')
      .withHeaders({
        'Content-Type': 'application/json',
        Cookie: 'token=$S{authToken}'
      })
      .expectStatus(StatusCodes.CREATED); // A API retorna 201 para DELETE [1]
  });

  // Teste 8: Verificar que a reserva foi deletada
  it('Deve retornar 404 ao tentar obter uma reserva deletada', async () => {
    await p
      .spec()
      .get(`${baseUrl}/booking/{id}`)
      .withPathParams('id', '$S{bookingId}')
      .withHeaders('Accept', 'application/json')
      .expectStatus(StatusCodes.NOT_FOUND);
  });

  // Teste 9: Verificar o endpoint de Health Check
  it('Deve confirmar que a API está operacional via /ping', async () => {
    await p.spec().get(`${baseUrl}/ping`).expectStatus(StatusCodes.CREATED); // A API retorna 201 para o ping [1]
  });

  // Teste 10: Tentar deletar sem autorização
  it('Deve retornar 403 Forbidden ao tentar deletar sem um token', async () => {
    await p
      .spec()
      .delete(`${baseUrl}/booking/1`) // Usa um ID qualquer para o teste
      .withHeaders('Content-Type', 'application/json')
      .expectStatus(StatusCodes.FORBIDDEN);
  });
});
