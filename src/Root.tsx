import "./index.css";
import { Composition } from "remotion";
import { QuizComposition } from "./Composition";
import { FPS, VIDEO_SECONDS } from "./layout";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="QuizComposition"
        component={QuizComposition}
        durationInFrames={VIDEO_SECONDS * FPS}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          quizData: {
            question: "In Britain, which organization is nicknamed “Aunty”?",
            options: ["Rolls Royce", "London Metal Exchange", "BBC", "None"],
            correctAnswer: 2,
            explanation:
              "The BBC is nicknamed “Auntie” (or “Auntie Beeb”) for its old, prim public-service image.",
          },
        }}
      />
    </>
  );
};
