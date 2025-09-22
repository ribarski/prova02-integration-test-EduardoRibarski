import pactum from 'pactum';
import { StatusCodes } from 'http-status-codes';
import { faker } from '@faker-js/faker';
import { SimpleReporter } from '../simple-reporter';

// A SimpleReporter pode ser um arquivo local seu, então comentei a importação.
// Se você tiver esse arquivo, pode descomentar a linha abaixo.
// import { SimpleReporter } from '../simple-reporter';

describe('Restful-booker API Test Suite', () => {
  const p = pactum;
  const rep = SimpleReporter;
  const baseUrl = 'https://restful-booker.herokuapp.com';

  let token = '';
  let bookingId = 0;

  const requestBody = {
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    totalprice: faker.number.int({ min: 100, max: 2000 }),
    depositpaid: true,
    bookingdates: {
      checkin: '2024-01-01',
      checkout: '2024-01-10',
    },
    additionalneeds: 'Breakfast',
  };

  p.request.setDefaultTimeout(30000);

  beforeAll(async () => {
    // p.reporter.add(rep);

    // Obter o token de autenticação antes de todos os testes
    // A API Restful-booker requer um token para as operações PUT, PATCH e DELETE [3, 4]
    token = await p
     .spec()
     .post(`${baseUrl}/auth`)
     .withJson({
        username: 'admin',
        password: 'password123',
      })
     .expectStatus(StatusCodes.OK)
     .returns('token');
  });

  afterAll(() => {
    // p.reporter.end();
  });

  describe('Booking Workflow', () => {
    it('Deve criar uma nova reserva com sucesso', async () => {
      await p
       .spec()
       .post(`${baseUrl}/booking`)
       .withHeaders('Content-Type', 'application/json')
       .withJson(requestBody)
       .expectStatus(StatusCodes.OK) // A API retorna 200 OK para criação, não 201 [3]
       .expectJsonSchema({
          type: 'object',
          properties: {
            bookingid: { type: 'number' },
            booking: {
              type: 'object',
              properties: {
                firstname: { type: 'string' },
                lastname: { type: 'string' },
                totalprice: { type: 'number' },
                depositpaid: { type: 'boolean' },
                bookingdates: {
                  type: 'object',
                  properties: {
                    checkin: { type: 'string', format: 'date' },
                    checkout: { type: 'string', format: 'date' },
                  },
                  required: ['checkin', 'checkout'],
                },
                additionalneeds: { type: 'string' },
              },
            },
          },
        })
       .stores('bookingId', 'bookingid'); // Armazena o ID da reserva para os próximos testes
    });

    it('Deve buscar a reserva recém-criada pelo ID', async () => {
      await p
       .spec()
       .get(`${baseUrl}/booking/{id}`)
       .withPathParams('id', '$S{bookingId}') // Usa o ID armazenado
       .expectStatus(StatusCodes.OK)
       .expectJsonLike(requestBody); // Valida se os dados retornados são os mesmos que foram enviados
    });

    it('Deve atualizar a reserva existente com sucesso', async () => {
      const updatedRequestBody = {
       ...requestBody,
        firstname: faker.person.firstName(),
        totalprice: faker.number.int({ min: 2001, max: 3000 }),
        additionalneeds: 'All included',
      };

      await p
       .spec()
       .put(`${baseUrl}/booking/{id}`)
       .withPathParams('id', '$S{bookingId}')
       .withHeaders({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Cookie: `token=${token}`, // A autenticação é feita via Cookie [4]
        })
       .withJson(updatedRequestBody)
       .expectStatus(StatusCodes.OK)
       .expectJsonLike(updatedRequestBody);
    });

    it('Deve deletar a reserva existente com sucesso', async () => {
      await p
       .spec()
       .delete(`${baseUrl}/booking/{id}`)
       .withPathParams('id', '$S{bookingId}')
       .withHeaders('Cookie', `token=${token}`)
       .expectStatus(StatusCodes.CREATED); // A API retorna 201 Created para um DELETE bem-sucedido [3]
    });

    it('Deve falhar ao buscar a reserva deletada', async () => {
      await p
       .spec()
       .get(`${baseUrl}/booking/{id}`)
       .withPathParams('id', '$S{bookingId}')
       .expectStatus(StatusCodes.NOT_FOUND);
    });
  });

  describe('Negative Scenarios', () => {
    it('Deve retornar 403 Forbidden ao tentar deletar sem token', async () => {
      // Tenta deletar um ID qualquer, já que o nosso foi apagado. O foco é o erro de autenticação.
      await p
       .spec()
       .delete(`${baseUrl}/booking/1`)
       .expectStatus(StatusCodes.FORBIDDEN);
    });

    it('Deve retornar 400 Bad Request para um payload malformado na criação', async () => {
      const malformedBody = {
       ...requestBody,
        totalprice: 'um-preco-invalido', // Enviando uma string onde deveria ser um número
      };

      await p
       .spec()
       .post(`${baseUrl}/booking`)
       .withHeaders('Content-Type', 'application/json')
       .withJson(malformedBody)
       .expectStatus(StatusCodes.BAD_REQUEST);
    });
  });
});