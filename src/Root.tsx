import "./index.css";
import { Composition } from "remotion";
import { QuizComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  // Sample quiz data - easily customizable
  const quizQuestions = [
    {
      question: "Which animal is known as the King of the Jungle?",
      options: ["Tiger", "Elephant", "Lion", "Gorilla"],
      correctAnswer: 2,
    },
    {
      question: "What is the largest ocean on Earth?",
      options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
      correctAnswer: 3,
    },
    {
      question: "How many continents are there?",
      options: ["5", "6", "7", "8"],
      correctAnswer: 2,
    },
    {
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correctAnswer: 2,
    },
    {
      question: "How many days are in a leap year?",
      options: ["364", "365", "366", "367"],
      correctAnswer: 2,
    },
    {
      question: "What is the smallest planet in our solar system?",
      options: ["Mars", "Mercury", "Venus", "Earth"],
      correctAnswer: 1,
    },
    {
      question: "Which country is home to the kangaroo?",
      options: ["New Zealand", "South Africa", "Australia", "Brazil"],
      correctAnswer: 2,
    },
    {
      question: "What is the freezing point of water?",
      options: ["0°C", "32°C", "100°C", "-10°C"],
      correctAnswer: 0,
    },
    {
      question: "How many legs does a spider have?",
      options: ["6", "8", "10", "12"],
      correctAnswer: 1,
    },
    {
      question: "What is the tallest mountain in the world?",
      options: ["K2", "Kilimanjaro", "Mount Everest", "Denali"],
      correctAnswer: 2,
    },
  ];

  return (
    <>
      {quizQuestions.map((quiz, index) => (
        <Composition
          key={index}
          id={`Quiz${index + 1}`}
          component={QuizComposition}
          durationInFrames={450}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            quizData: quiz,
          }}
        />
      ))}
    </>
  );
};
