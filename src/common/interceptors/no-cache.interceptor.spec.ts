import { ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { NoCacheInterceptor } from './no-cache.interceptor.js';

describe('NoCacheInterceptor', () => {
  let interceptor: NoCacheInterceptor;

  beforeEach(() => {
    interceptor = new NoCacheInterceptor();
  });

  it('should remove conditional headers from request and add no-cache headers to response', async () => {
    const mockRequest = {
      headers: {
        'if-none-match': '"12345"',
        'if-modified-since': 'Wed, 21 Oct 2015 07:28:00 GMT',
        authorization: 'Bearer token',
      },
    };

    const setHeaderMock = vi.fn();
    const removeHeaderMock = vi.fn();

    const mockResponse = {
      setHeader: setHeaderMock,
      removeHeader: removeHeaderMock,
    };

    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;

    const mockCallHandler = {
      handle: () => of({ data: 'test' }),
    };

    const result = await firstValueFrom(
      interceptor.intercept(mockExecutionContext, mockCallHandler),
    );

    expect(result).toEqual({ data: 'test' });
    expect(mockRequest.headers['if-none-match']).toBeUndefined();
    expect(mockRequest.headers['if-modified-since']).toBeUndefined();
    expect(mockRequest.headers['authorization']).toBe('Bearer token');

    expect(setHeaderMock).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    expect(setHeaderMock).toHaveBeenCalledWith('Pragma', 'no-cache');
    expect(setHeaderMock).toHaveBeenCalledWith('Expires', '0');
    expect(setHeaderMock).toHaveBeenCalledWith('Surrogate-Control', 'no-store');
    expect(removeHeaderMock).toHaveBeenCalledWith('ETag');
  });
});

