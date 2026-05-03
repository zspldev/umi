export function SplashScreen() {
  const bg = "#F7F5F1";
  const navy = "#0E1729";
  const amber = "#F59E0B";
  const mutedFg = "#6B7F96";
  const domain = "1201c571-c9f2-4e45-8bcf-f648e5787b31-00-qlpylgbbo9ec.worf.replit.dev";
  const markUrl = `https://${domain}:5904/xlango-mark.png`;
  const wordmarkUrl = `https://${domain}:5904/xlango-wordmark.png`;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "system-ui, sans-serif",
        overflow: "hidden",
        paddingTop: 80,
        paddingBottom: 60,
        boxSizing: "border-box",
      }}
    >
      {/* XLango logo cluster */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flex: 1,
          justifyContent: "center",
        }}
      >
        <img
          src={markUrl}
          alt="XLango mark"
          style={{
            width: 120,
            height: 120,
            objectFit: "contain",
            marginBottom: -52,
          }}
        />
        <img
          src={wordmarkUrl}
          alt="xlango"
          style={{
            width: 340,
            height: 102,
            objectFit: "contain",
            marginBottom: -36,
          }}
        />
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: mutedFg,
            margin: 0,
            fontWeight: 500,
          }}
        >
          Live Global Voice Interpreter
        </p>
      </div>

      {/* Created by + Zapurzaa */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          paddingBottom: 8,
        }}
      >
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: mutedFg,
            margin: 0,
            fontWeight: 500,
          }}
        >
          Created by
        </p>
        <img
          src="/zapurzaa-logo.png"
          alt="Zapurzaa Systems"
          style={{
            width: 200,
            height: 50,
            objectFit: "contain",
          }}
        />
      </div>

      {/* Loading dots */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          paddingBottom: 4,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: amber,
              opacity: i === 0 ? 1 : i === 1 ? 0.55 : 0.25,
            }}
          />
        ))}
      </div>
    </div>
  );
}
