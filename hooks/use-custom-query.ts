import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';

/**
 * 공통 useQuery 래퍼.
 * 앱 전역의 query 기본 옵션을 한 곳에서 관리할 수 있도록 감쌉니다.
 */
export function useCustomQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[],
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> {
  return useQuery(options);
}
