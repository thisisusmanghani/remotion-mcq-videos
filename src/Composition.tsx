import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  staticFile,
  Sequence,
} from 'remotion';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer?: number;
}

export const QuizComposition: React.FC<{ quizData: QuizQuestion }> = ({
  quizData,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation springs
  const headerEntry = spring({
    frame: frame - 10,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
    },
  });

  const questionEntry = spring({
    frame: frame - 20,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
    },
  });

  const optionsEntry = (index: number) =>
    spring({
      frame: frame - (30 + index * 5),
      fps,
      config: {
        damping: 100,
        stiffness: 200,
      },
    });

  const headerY = interpolate(headerEntry, [0, 1], [-100, 0]);
  const questionScale = interpolate(questionEntry, [0, 1], [0.5, 1]);
  const questionOpacity = interpolate(questionEntry, [0, 1], [0, 1]);

  // Countdown timer (starts from 10 seconds)
  const totalSeconds = 10;
  const currentSecond = Math.max(0, totalSeconds - Math.floor(frame / fps));
  const countdownEndFrame = totalSeconds * fps; // Frame when countdown ends
  const showTimer = frame < countdownEndFrame; // Hide timer when countdown completes

  // Correct answer reveal animation (starts after countdown completes)
  const answerReveal = spring({
    frame: frame - countdownEndFrame,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
    },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a3d0f' }}>
      {/* Background Music - plays only during countdown */}
      {frame < countdownEndFrame && (
        <Audio src={staticFile('chinese-lunar-new-year-465871.mp3')} volume={0.25} />
      )}
      
      {/* Success sound when correct answer reveals - PLAYS AT TICK */}
      <Sequence from={countdownEndFrame}>
        <Audio 
          src={staticFile('success-340660.mp3')} 
          volume={1}
        />
      </Sequence>
      
      {/* Jungle Background Image from Canva */}
      <img
        src={staticFile('Which animal is known as the King of the Jungle.png')}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* GK Band - Top Left Corner */}
      <div
        style={{
          position: 'absolute',
          top: '80px',
          left: '-80px',
          width: '400px',
          height: '120px',
          backgroundColor: '#d4a574',
          transform: 'rotate(-45deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
          border: '5px solid #2d5016',
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontSize: '72px',
            fontWeight: '900',
            color: '#2d5016',
            fontFamily: 'Arial Black, Arial, sans-serif',
            letterSpacing: '8px',
            textShadow: '2px 2px 4px rgba(255, 255, 255, 0.3)',
          }}
        >
          GK
        </span>
      </div>

      {/* GK Band - Top Right Corner (Mirrored) */}
      <div
        style={{
          position: 'absolute',
          top: '80px',
          right: '-80px',
          width: '400px',
          height: '120px',
          backgroundColor: '#d4a574',
          transform: 'rotate(45deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
          border: '5px solid #2d5016',
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontSize: '61px',
            fontWeight: '900',
            color: '#2d5016',
            fontFamily: 'Arial Black, Arial, sans-serif',
            letterSpacing: '8px',
            textShadow: '2px 2px 4px rgba(255, 255, 255, 0.3)',
          }}
        >
          SERIES
        </span>
      </div>

      {/* Quiz Container */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 30px',
        }}
      >
        {/* Countdown Timer - Alarm Clock */}
        {showTimer && (
          <div
            style={{
              position: 'absolute',
              top: '41%',
              left: '50%',
              transform: `translateX(-50%) scale(${interpolate(spring({ frame, fps, config: { damping: 100, stiffness: 200 } }), [0, 1], [0.8, 1])}) rotate(${Math.sin(frame / 10) * 3}deg)`,
            }}
          >
            {/* Alarm Clock Bells */}
            <div style={{ position: 'absolute', top: '-13px', left: '26px', width: '34px', height: '34px', backgroundColor: '#d4a574', borderRadius: '50% 50% 0 0', transform: 'rotate(-20deg)' }} />
            <div style={{ position: 'absolute', top: '-13px', right: '26px', width: '34px', height: '34px', backgroundColor: '#d4a574', borderRadius: '50% 50% 0 0', transform: 'rotate(20deg)' }} />
            
            {/* Clock Body - Circular */}
            <div
              style={{
                width: '238px',
                height: '238px',
                backgroundColor: '#d4a574',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '7px solid #2d5016',
                boxShadow: `0 10px 30px rgba(0, 0, 0, 0.5), inset 0 4px 10px rgba(0, 0, 0, 0.2)`,
                position: 'relative',
              }}
            >
              {/* Inner Circle - White Face */}
              <div
                style={{
                  width: '204px',
                  height: '204px',
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '4px solid #2d5016',
                }}
              >
                <span
                  style={{
                    fontSize: '119px',
                    fontWeight: '900',
                    color: currentSecond <= 3 ? '#d32f2f' : '#2d5016',
                    fontFamily: 'Arial Black, Arial, sans-serif',
                  }}
                >
                  {currentSecond}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Question Card - Separate Box */}
        <div
          style={{
            position: 'absolute',
            top: '28%',
            width: '90%',
            maxWidth: '950px',
            transform: `scale(${questionScale})`,
            opacity: questionOpacity,
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              borderRadius: '25px',
              padding: '35px 40px',
              boxShadow: '0 15px 40px rgba(0, 0, 0, 0.4)',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '56px',
                fontWeight: '900',
                color: '#3d5a1f',
                textAlign: 'center',
                lineHeight: 1.35,
                fontFamily: 'Arial Black, Arial, sans-serif',
                letterSpacing: '0.5px',
              }}
            >
              {quizData.question}
            </h2>
          </div>
        </div>

        {/* Options - Individual Boxes */}
        <div
          style={{
            position: 'absolute',
            top: '52%',
            width: '90%',
            maxWidth: '950px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
            {quizData.options.map((option, index) => {
              const optionSpring = optionsEntry(index);
              const optionX = interpolate(optionSpring, [0, 1], [-300, 0]);
              const optionOpacity = interpolate(optionSpring, [0, 1], [0, 1]);
              
              const isCorrect = index === quizData.correctAnswer;
              const showAnswer = answerReveal > 0;
              
              // Correct answer highlight animation
              const highlightScale = isCorrect && showAnswer 
                ? interpolate(answerReveal, [0, 1], [1, 1.05])
                : 1;
              const glowIntensity = isCorrect && showAnswer
                ? interpolate(answerReveal, [0, 1], [0, 1])
                : 0;

              return (
                <div
                  key={index}
                  style={{
                    transform: `translateX(${optionX}px) scale(${highlightScale})`,
                    opacity: optionOpacity,
                  }}
                >
                  <div
                    style={{
                      background: 'transparent',
                      padding: '0px 19px 93px 190px',
                      borderRadius: '15px',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      boxShadow: 'none',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                    }}
                  >
                    {isCorrect && showAnswer && (
                      <div
                        style={{
                          position: 'absolute',
                          right: '120px',
                          top: '28%',
                          transform: `translateY(-50%) scale(${interpolate(answerReveal, [0, 1], [0, 1])}) rotate(${interpolate(answerReveal, [0, 1], [-180, 0])}deg)`,
                          opacity: glowIntensity,
                        }}
                      >
                        <div
                          style={{
                            width: '180px',
                            height: '180px',
                            borderRadius: '50%',
                            backgroundColor: '#4CAF50',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 0 ${40 + glowIntensity * 40}px rgba(76, 175, 80, ${0.8 * glowIntensity})`,
                            border: '6px solid #fff',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '90px',
                              color: '#fff',
                              fontWeight: 'bold',
                              lineHeight: '1',
                            }}
                          >
                            ✓
                          </span>
                        </div>
                      </div>
                    )}
                    <span
                      style={{
                        fontSize: '84px',
                        color: isCorrect && showAnswer 
                          ? (Math.floor((frame - countdownEndFrame) / 10) % 2 === 0 ? '#4CAF50' : '#fff')
                          : '#fff',
                        fontWeight: '800',
                        fontFamily: 'Arial Black, Arial, sans-serif',
                        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {option}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
