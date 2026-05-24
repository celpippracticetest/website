import dynamic from "next/dynamic";

const ShowTasksLazy = dynamic(() => import("./index"));

export default ShowTasksLazy;
