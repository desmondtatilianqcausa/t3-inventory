import React from "react";

type Props = {
  demoProp: string;
};

export default function DemoComponent({ demoProp }: Props) {
  return (
    <div>
      <p>DemoComponent</p>
      <p>DemoProp: {demoProp}</p>
    </div>
  );
}
