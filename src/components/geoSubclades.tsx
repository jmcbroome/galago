import { CladeDescription } from "../d";
import { FormatDataPoint } from "./formatters/dataPoint";
import { FormatStringArray } from "./formatters/stringArray";

type geoSubcladesProps = {
  clade_description: CladeDescription;
};

function GeoSublades(props: geoSubcladesProps) {
  const { clade_description } = props;

  const no_data = clade_description.subclade_geo === null;
  if (no_data) {
    return <></>;
  }

  const geo_monophyletic =
    clade_description.subclade_geo && clade_description.subclades.length === 0;

  const subclade_locations =
    clade_description.subclades.length > 0 &&
    typeof clade_description.subclade_geo === "string"
      ? clade_description.subclades.map(
          //@ts-ignore - we've already excluded the case where subclade_geo is null on line 10
          (s) => s.node_attrs[clade_description.subclade_geo]["value"]
        )
      : [];

  return (
    <div>
      <h2>
        Has transmission between geographic areas contributed to this clade?
      </h2>

      <p style={{ fontStyle: "italic" }}>
        By overlaying the geographic location of samples with the hierarchical
        clustering from the tree, we can infer the minimum number of
        transmissions between locations that have contributed to your clade of
        interest.
      </p>

      <p className="results">
        {/* {no_data &&
          "While there are samples within your clade from other locations, we aren't able to report on specific transmissions between locations because this was not inferred by Nextstrain upstream."} */}

        {!no_data && geo_monophyletic && (
          <>
            All of the samples in this clade are from the same{" "}
            <FormatDataPoint value={clade_description.subclade_geo} />; we do
            not see evidence of multiple introductions to{" "}
            <FormatDataPoint
              //@ts-ignore
              value={clade_description.home_geo[clade_description.subclade_geo]}
            />
            <br />
            <br />
            Thus, it is plausible that these samples were all the result of a
            single introduction, followed by local spread.
          </>
        )}

        {!no_data && !geo_monophyletic && (
          <>
            At least{" "}
            <FormatDataPoint value={clade_description.subclades.length} />{" "}
            transmission(s) between{" "}
            <FormatDataPoint
              value={
                //@ts-ignore
                clade_description["home_geo"][clade_description.subclade_geo]
              }
            />{" "}
            and these locations have contributed to this clade:{" "}
            <FormatStringArray values={subclade_locations} />
          </>
        )}
      </p>
      <p>
        As always, the strength of this evidence depends on how representative
        your dataset is (see below).
      </p>
    </div>
  );
}

export default GeoSublades;