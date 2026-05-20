import { createFileRoute } from "@tanstack/react-router";
import Game from "../pages/Game.jsx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DirtBike Rider" },
      { name: "description", content: "Freestyle dirtbike game with track editor and multiplayer riding." },
    ],
  }),
  component: Index,
});

function Index() {
  return <Game />;
}
