import type { StateCreator as ZustandStateCreator } from "zustand/vanilla";
import type {} from "zustand/middleware/immer";

type ImmerStateCreator<TSlice extends object> = ZustandStateCreator<
  TSlice,
  [["zustand/immer", never]],
  [],
  TSlice
>;

type GenericImmerStateCreator<TSlice extends object> = {
  <TStore extends TSlice = TSlice>(
    ...args: Parameters<ZustandStateCreator<TStore, [["zustand/immer", never]], [], TSlice>>
  ): TSlice;
};

export default function immerStateCreator<TSlice extends object>(
  creator: ImmerStateCreator<TSlice>,
) {
  return creator as GenericImmerStateCreator<TSlice>;
}
