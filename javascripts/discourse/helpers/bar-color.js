import { helper } from "@ember/component/helper";

export function barColor([percentage]) {
  if (percentage < 50) return "#F00"; // Red for less than 50%
  else if (percentage < 75) return "#FFA500"; // Orange for less than 75%
  else return "#008000"; // Green for 75% or above
}

export default helper(barColor);
