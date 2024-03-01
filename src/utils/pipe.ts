import type { NoInfer } from '@/utils/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnySingleParamFn = (arg: any) => any;

type PipeArgs<
  Fns extends AnySingleParamFn[],
  Acc extends AnySingleParamFn[] = []
> = Fns extends [(arg: infer Param) => infer Return]
  ? [...Acc, (arg: Param) => Return]
  : Fns extends [(arg: infer Param) => any, ...infer Tail]
  ? Tail extends [(arg: infer Return) => any, ...any[]]
    ? PipeArgs<Tail, [...Acc, (arg: Param) => Return]>
    : never
  : Fns extends []
  ? [] // Only one function was passed to `pipe`
  : never;

type LastFnReturnType<F extends Array<AnySingleParamFn>, Else> = F extends [
  ...any[],
  (...arg: any) => infer R
]
  ? R
  : Else;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** @see https://dev.to/ecyrbe/how-to-use-advanced-typescript-to-define-a-pipe-function-381h */
export function pipe<
  FirstFn extends AnySingleParamFn,
  const Fns extends AnySingleParamFn[],
  ValidatedFns extends AnySingleParamFn[] = PipeArgs<Fns>,
  ValidatedFirstFn extends AnySingleParamFn = (
    arg: Parameters<FirstFn>[0]
  ) => ValidatedFns extends []
    ? ReturnType<FirstFn>
    : Parameters<ValidatedFns[0]>[0]
>(
  arg: Parameters<FirstFn>[0],
  firstFn: FirstFn extends ValidatedFirstFn
    ? FirstFn
    : NoInfer<ValidatedFirstFn> /* Only infer if `FirstFn` is valid */,
  // Only infer if `Fns` is valid
  ...fns: Fns extends ValidatedFns ? Fns : NoInfer<ValidatedFns>
): LastFnReturnType<Fns, ReturnType<FirstFn>> {
  return (fns as ValidatedFns).reduce((acc, fn) => fn(acc), firstFn(arg));
}
