import dynamic from "next/dynamic";
import PracticeSubPageLoading from "@/components/practice-seo/PracticeSubPageLoading";

const ListeningPracticeLazy = dynamic(
  () => import("./ListeningPractice"),
  { loading: () => <PracticeSubPageLoading /> }
);

export default ListeningPracticeLazy;
