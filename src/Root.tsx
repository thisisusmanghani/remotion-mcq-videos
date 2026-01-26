import "./index.css";
import { Composition } from "remotion";
import { QuizComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="QuizComposition"
        component={QuizComposition}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          quizData: {
            question: "Sample Question?",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: 0,
          },
        }}
      />
    </>
  );
};
