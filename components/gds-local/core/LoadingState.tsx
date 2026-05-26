import { StateBlock } from "./StateBlock";

type LoadingStateProps = {
  label: string;
  minHeight?: number | string;
};

export function LoadingState({ label, minHeight = "50vh" }: LoadingStateProps) {
  return <StateBlock variant="loading" title={label} compact minHeight={minHeight} />;
}
