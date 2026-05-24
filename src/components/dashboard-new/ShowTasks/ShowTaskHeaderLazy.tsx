import dynamic from "next/dynamic";

const ShowTaskHeaderLazy = dynamic(() => import("./Header"));

export default ShowTaskHeaderLazy;
