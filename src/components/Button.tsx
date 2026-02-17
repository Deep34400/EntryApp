import React from "react";
import { PrimaryButton } from "@/components/Button/PrimaryButton";

export function Button(
  props: React.ComponentProps<typeof PrimaryButton>
) {
  return <PrimaryButton {...props} />;
}
