import ChevronDown from "@mui/icons-material/KeyboardArrowDown";
import { Box } from "@/components/ui/Box";

export const FAQ_DATA = [
  {
    question: "What is the CELPIP exam?",
    answer:
      "The CELPIP (Canadian English Language Proficiency Index Program) is an English language test used for Canadian immigration, professional certification, and citizenship. It evaluates listening, reading, writing, and speaking skills.",
  },
  {
    question: "How long is the CELPIP test?",
    answer:
      "The CELPIP-General test takes about three hours to complete and includes listening, reading, writing, and speaking sections in one sitting on a computer.",
  },
  {
    question: "What is included in a CELPIP practice test?",
    answer:
      "A full CELPIP practice test includes listening, reading, writing, and speaking sections that follow the same structure, timing, and question types as the real exam.",
  },
  {
    question: "Are CELPIP mock exams similar to the real test?",
    answer:
      "Yes, high-quality CELPIP mock exams simulate the real exam experience, including the same format, time limits, and task types.",
  },
  {
    question: "How many practice tests should I take before the CELPIP exam?",
    answer:
      "Most candidates benefit from taking three to five full mock exams before the real test to improve time management and confidence.",
  },
  {
    question: "What CELPIP score is required for Canadian immigration?",
    answer:
      "Many Canadian PR programs require CLB 7 or higher, which usually corresponds to CELPIP level 7 in each section.",
  },
  {
    question: "Is CELPIP easier than IELTS?",
    answer:
      "CELPIP is often considered easier for candidates familiar with Canadian accents and everyday English. It is fully computer-based and uses practical situations.",
  },
  {
    question: "How can I improve my CELPIP score quickly?",
    answer:
      "You can improve your score by taking full-length practice tests, reviewing mistakes, practicing under timed conditions, and learning common vocabulary and question types.",
  },
  {
    question: "How often should I take a CELPIP mock test?",
    answer:
      "You should take a full mock test every five to seven days and focus on improving weak areas between tests.",
  },
  {
    question: "Can practice tests really help increase my CELPIP score?",
    answer:
      "Yes. Practice tests help you understand the exam format, improve speed and accuracy, reduce anxiety, and identify weak areas.",
  },
];

const ExamFAQ = () => {
  return (
    <Box className="w-full mt-12 mb-8">
      <h2 className="text-2xl font-bold text-[#37465C] mb-6 text-center">
        Frequently Asked Questions
      </h2>
      <div className="flex flex-col gap-4">
        {FAQ_DATA.map((faq, index) => (
          <details
            key={index}
            className="group border border-[#E0E0E0] rounded-[16px] bg-[#F8F9FC] overflow-hidden"
          >
            <summary className="flex justify-between items-center p-[24px] cursor-pointer list-none [&::-webkit-details-marker]:hidden bg-[#F8F9FC] hover:bg-[#F1F3F9] transition-colors">
              <span className="text-[16px] screen744:!text-[18px] font-medium text-text1 pr-[16px]">
                {faq.question}
              </span>
              <span className="transform transition-transform duration-300 group-open:rotate-180 min-w-[20px]">
                <ChevronDown />
              </span>
            </summary>
            <div className="overflow-hidden">
              <div
                className="px-[24px] pb-[24px] pt-4 text-[16px] text-[#5F6D7E] leading-[24px]"
                dangerouslySetInnerHTML={{ __html: faq.answer }}
              />
            </div>
          </details>
        ))}
      </div>
    </Box>
  );
};

export default ExamFAQ;
