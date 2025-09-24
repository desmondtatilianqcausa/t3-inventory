import React from "react";

interface BaseProps {
  id?: number;
  name?: string | null;
}

function SinglePostComponent<T extends BaseProps>(props?: T) {
  return (
    <div className="rounded-md bg-white bg-opacity-10 p-3 shadow-md">
      <p>{props?.name}</p>
      <p>{props?.id}</p>
    </div>
  );
}

export default SinglePostComponent;
