import { ArrowRight, Bike, Bus, Leaf, Footprints, Recycle } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeading from "../../components/PageHeading";
import Panel from "../../components/Panel";

const ideas = [
  {
    icon: Footprints,
    title: "Short walk",
    text: "For a nearby trip, consider walking if the route and conditions suit you.",
  },
  {
    icon: Bike,
    title: "Bike or roll",
    text: "Choose an active trip option when it is practical and comfortable.",
  },
  {
    icon: Bus,
    title: "Transit or shared ride",
    text: "Combine errands or share a trip when it fits your schedule.",
  },
  {
    icon: Recycle,
    title: "Keep items in use",
    text: "Repair, reuse, or borrow before buying something new.",
  },
];

export default function AlternativesPage() {
  return (
    <>
      <PageHeading
        eyebrow="SMALLER FOOTPRINT"
        title="Better choices"
        description="Practical alternatives for everyday routines, chosen to fit your day."
      />
      <Panel className="alternatives-banner">
        <div className="feature-icon soft">
          <Leaf size={20} />
        </div>
        <div>
          <span className="eyebrow">TWO DIFFERENT OUTCOMES</span>
          <h2>Environmental impact and personal exposure are separate.</h2>
          <p>
            These ideas do not claim to reduce your personal exposure. No
            emissions savings are estimated without activity details and a
            matching sourced factor.
          </p>
        </div>
      </Panel>
      <div className="alternative-grid">
        {ideas.map(({ icon: Icon, title, text }, index) => (
          <Panel className="alternative-card" key={title}>
            <div className="alternative-top">
              <span className="alternative-number">0{index + 1}</span>
              <span className="feature-icon">
                <Icon size={19} />
              </span>
            </div>
            <h2>{title}</h2>
            <p>{text}</p>
            <Link to="/planner" className="text-link">
              Add to today’s plan <ArrowRight size={15} />
            </Link>
          </Panel>
        ))}
      </div>
      <div className="notice notice-info">
        <span>
          Pick what works for your location, mobility, and local conditions.
          There is no single option that fits every trip.
        </span>
      </div>
    </>
  );
}
