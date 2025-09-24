import React from "react";
import SinglePostComponent from "../../_components/Post";
import { fetchAllWorkspaces } from "./actions";

// eslint-disable-next-line @typescript-eslint/ban-types
type Props = {};

async function Page({}: Props) {
  const fetchedWorkspaces = await fetchAllWorkspaces();
  const workspaces = fetchedWorkspaces?.data.workspaces;

  return (
    <div className="space-y-3">
      {workspaces?.map((workspace, index) => (
        <SinglePostComponent key={index} {...workspace} />
      ))}
    </div>
  );
}
export default Page;
