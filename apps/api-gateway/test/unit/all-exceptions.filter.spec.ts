import { HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';

function buildHost(status: jest.Mock, json: jest.Mock) {
  return {
    switchToHttp: () => ({
      getResponse: () => ({
        status,
        json,
      }),
      getRequest: () => ({ url: '/test-route', method: 'GET' }),
    }),
  } as any;
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  });

  describe('when an HttpException is thrown', () => {
    it('returns the correct HTTP status code', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
      const host = buildHost(mockStatus, mockJson);

      filter.catch(exception, host);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('includes the exception message in the response body', () => {
      const exception = new HttpException(
        'Bad request',
        HttpStatus.BAD_REQUEST,
      );
      const host = buildHost(mockStatus, mockJson);

      filter.catch(exception, host);

      const body = mockJson.mock.calls[0][0];
      expect(body.message).toBe('Bad request');
      expect(body.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(body.path).toBe('/test-route');
      expect(body.timestamp).toBeDefined();
    });

    it('returns 401 for UnauthorizedException', () => {
      const { UnauthorizedException } = require('@nestjs/common');
      const exception = new UnauthorizedException('No token');
      const host = buildHost(mockStatus, mockJson);

      filter.catch(exception, host);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('when a generic Error is thrown', () => {
    it('returns 500 Internal Server Error', () => {
      const exception = new Error('Something exploded');
      const host = buildHost(mockStatus, mockJson);

      filter.catch(exception, host);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('includes the error message in the body', () => {
      const exception = new Error('Database connection lost');
      const host = buildHost(mockStatus, mockJson);

      filter.catch(exception, host);

      const body = mockJson.mock.calls[0][0];
      expect(body.message).toBe('Database connection lost');
      expect(body.statusCode).toBe(500);
    });
  });

  describe('when a non-Error object is thrown', () => {
    it('returns 500 with fallback message', () => {
      const host = buildHost(mockStatus, mockJson);

      filter.catch({ weird: true }, host);

      expect(mockStatus).toHaveBeenCalledWith(500);
      const body = mockJson.mock.calls[0][0];
      expect(body.message).toBe('Internal server error');
    });
  });
});
