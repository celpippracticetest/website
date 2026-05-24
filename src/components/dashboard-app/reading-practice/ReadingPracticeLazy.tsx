import dynamic from "next/dynamic";
import PracticeSubPageLoading from "@/components/practice-seo/PracticeSubPageLoading";

const ReadingPracticeLazy = dynamic(
  () => import("./ReadingPractice"),
  { loading: () => <PracticeSubPageLoading /> }
);

export default ReadingPracticeLazy;
