import {
  get_leaves,
  get_root,
  find_leaf_by_name,
  get_mrca,
  getNodeAttr,
  traverse_preorder,
} from "../utils/treeMethods";
import { ingestNextstrain } from "../utils/nextstrainAdapter";
import { CladeDescription, caseDefFilter, Node } from "../d";
import demo_sample_names from "../../data/demo_sample_names";
import { demoMetadata } from "../../data/demo_fake_metadata";
import { demo_tree } from "../../data/demo_tree";
import { getMrcaOptions } from "../utils/clusterMethods";
import { get_location_input_options } from "../utils/geoInputOptions";
import {
  ingestCSVMetadata,
  treeMetadataCensus,
  zipMetadataToTree,
} from "../utils/metadataUtils";
import { describe_clade } from "../utils/describeClade";
import { tree } from "d3";

const defaultState = {
  samplesOfInterestNames: [],
  samplesOfInterest: [],
  mrca: null,
  mrcaOptions: [],
  clusteringMrcas: [],
  tree: null,
  location: "",
  division: "",
  country: "USA",
  region: "North America",
  testValue: 0,
  metadataCensus: {},
  metadataEntries: [],
  metadataFieldToMatch: "",
  caseDefFilters: {},
  samplesMatchingCaseDef: [],
  loadReport: false,
  cladeDescription: null,
  viewPlot: "scatter",
  debugReducers: false,
  clusteringMethod: "none",
  clusteringMetadataField: undefined,
};

export const global = (state = defaultState, action: any) => {
  switch (action.type) {
    case "call home": {
      return { ...state, testValue: state.testValue + 1 };
    }

    case "reset to default": {
      return defaultState;
    }

    case "view plot toggled": {
      return { ...state, viewPlot: action.data };
    }

    case "load demo": {
      // TODO: this should all probably live in an thunk + action constructor instead of duplicating code from a bunch of individual reducers. But, they're all short and this gets us off the ground for now.
      const tree = ingestNextstrain(demo_tree);
      const treeMetadata = treeMetadataCensus(tree);
      const samplesOfInterestNames = demo_sample_names
        .split(/[,\s]+/)
        .map((s: string) => s.trim());
      const samplesOfInterest = samplesOfInterestNames
        .map((n: string) => find_leaf_by_name(n, get_leaves(tree)))
        .filter((n: Node | null) => n !== null);
      //@ts-ignore -- we already check for null samples on the line above
      const mrca = get_mrca(samplesOfInterest);

      const { tidyMetadata, metadataCensus } = ingestCSVMetadata(demoMetadata);
      zipMetadataToTree(tree, tidyMetadata, "sample id");
      // console.log(tree);

      const cladeDescription = describe_clade(
        mrca,
        {
          location: "Humboldt County",
          division: "California",
          country: "USA",
          region: "North America",
        },
        [0, 2],
        1,
        // @ts-ignore
        samplesOfInterest
      );

      return {
        ...defaultState,
        tree: tree,
        metadataEntries: tidyMetadata,
        metadataCensus: { ...treeMetadata, ...metadataCensus },
        metadataFieldToMatch: "sample id",
        samplesOfInterestNames: samplesOfInterestNames,
        samplesOfInterest: samplesOfInterest,
        mrca: mrca,
        //@ts-ignore -- we already check for null samples on the line above
        mrcaOptions: getMrcaOptions(tree, samplesOfInterest, []),
        location: "Humboldt County",
        division: "California",
        loadReport: true,
        cladeDescription: cladeDescription,
      };
    }

    case "clustering metadata field selected": {
      return {
        ...state,
        clusteringMetadataField: action.data,
      };
    }

    case "clustering method selected": {
      console.log("method set to", action.data);
      return {
        ...state,
        clusteringMethod: action.data,
      };
    }

    case "clustering results updated": {
      if (state.tree) {
        return {
          ...state,
          clusteringMrcas: action.data,
          mrcaOptions: getMrcaOptions(
            state.tree,
            state.samplesOfInterest,
            action.data
          ),
        };
      } else {
        return state;
      }
    }

    case "mrca clicked": {
      const mrca = action.data;
      let cladeDescription: null | CladeDescription = state.cladeDescription;
      if (state.tree && state.location && state.division) {
        cladeDescription = describe_clade(
          mrca,
          {
            location: state.location,
            division: state.division,
            country: state.country,
            region: state.region,
          },
          [0, 2],
          1,
          state.samplesOfInterest
        );
        // console.log("new clade description", cladeDescription);
      }

      return {
        ...state,
        mrca: action.data,
        cladeDescription: cladeDescription,
      };
    }

    case "sample names string changed": {
      const input_string: string = action.data;
      const sample_names: string[] = input_string
        .split(/[,\s]+/)
        .map((s: string) => s.trim());
      return { ...state, samplesOfInterestNames: sample_names };
    }

    case "sample submit button clicked": {
      if (state.samplesOfInterestNames && state.tree) {
        let all_leaves = get_leaves(get_root(state.tree));
        const newSamplesOfInterest = state.samplesOfInterestNames
          .map((n: string) => find_leaf_by_name(n, all_leaves))
          .filter((n: Node | null) => n !== null);
        return {
          ...state,
          samplesOfInterest: newSamplesOfInterest,
          mrcaOptions: getMrcaOptions(
            state.tree,
            //@ts-ignore - we already filter out null values above
            newSamplesOfInterest,
            state.clusteringMrcas
          ),
        };
      } else {
        return state;
      }
    }

    case "tree file uploaded": {
      if (state.debugReducers) {
        console.log(
          "REDUCER 'tree file uploaded' - setting tree to",
          action.data
        );
      }
      const tree = action.data;
      const treeMetadata = treeMetadataCensus(tree);

      return {
        ...state,
        tree: tree,
        mrcaOptions: traverse_preorder(tree).filter(
          (node: Node) => node.children.length >= 2
        ),
        metadataCensus: { ...state.metadataCensus, ...treeMetadata },
      };
    }

    case "location set": {
      if (state.debugReducers) {
        console.log(
          "REDUCER 'location set' - setting location to",
          action.data
        );
      }
      return { ...state, location: action.data };
    }

    case "division set": {
      if (state.debugReducers) {
        console.log(
          "REDUCER 'division set' - setting division to",
          action.data
        );
      }
      if (state.tree) {
        const newLocationOptions = get_location_input_options(
          state.tree,
          action.data
        );
        return {
          ...state,
          division: action.data,
          locationOptions: newLocationOptions,
        };
      }
    }

    case "metadata uploaded and parsed": {
      if (state.debugReducers) {
        console.log("REDUCER metadata uploaded and parsed", action.data);
      }
      const { tidyMetadata, metadataCensus } = action.data;

      return {
        ...state,
        metadataEntries: tidyMetadata,
        metadataCensus: { ...state.metadataCensus, ...metadataCensus },
      };
    }

    case "metadata match field selected": {
      if (action.data) {
        return {
          ...state,
          metadataFieldToMatch: action.data,
        };
      }
    }

    case "case definition filters updated": {
      const newFilter = action.data;
      const field = newFilter.field;
      let newState: { [key: string]: caseDefFilter } = {
        ...state.caseDefFilters,
      };

      if (newFilter.dataType === "continuous") {
        if (
          //@ts-ignore
          state.metadataCensus[field]["min"] === newFilter["max"] &&
          //@ts-ignore
          state.metadataCensus[field]["max"] === newFilter["max"]
        ) {
          delete newState[field]; // range is no longer restricted? remove filter
        } else {
          delete newFilter["field"];
          newState[field] = newFilter;
        }
      } else if (newFilter.dataType === "categorical") {
        //@ts-ignore
        if (
          newFilter.acceptedValues.length ===
            //@ts-ignore
            state.metadataCensus[field]["uniqueValues"].length ||
          newFilter.acceptedValues.length === 0
        ) {
          delete newState[field];
        } else {
          delete newFilter["field"];
          newState[field] = newFilter;
        }
      }
      return { ...state, caseDefFilters: newState };
    }

    // TODO: also update samplesOfInterest with matching samples
    case "case definition submitted": {
      if (state.tree && state.caseDefFilters) {
        let matchingSamples: Node[] = get_leaves(state.tree);
        if (Object.keys(state.caseDefFilters).length === 0) {
          return { ...state, samplesMatchingCaseDef: matchingSamples };
        }

        for (let i = 0; i < Object.entries(state.caseDefFilters).length; i++) {
          let thisFilter = Object.entries(state.caseDefFilters)[i];

          //@ts-ignore
          if (thisFilter[1]["dataType"] === "categorical") {
            //@ts-ignore
            matchingSamples = matchingSamples.filter((n: Node) =>
              //@ts-ignore
              thisFilter[1]["acceptedValues"].includes(
                getNodeAttr(n, thisFilter[0])
              )
            );
          } else {
            //@ts-ignore
            matchingSamples = matchingSamples.filter(
              (n: Node) =>
                //@ts-ignore
                getNodeAttr(n, thisFilter[0]) <= thisFilter[1]["max"] &&
                getNodeAttr(
                  n,
                  //@ts-ignore
                  thisFilter[0]
                  //@ts-ignore
                ) >= thisFilter[1]["min"]
            );
          }
        }

        matchingSamples = matchingSamples.filter(
          //@ts-ignore - wtf is this one
          (n: Node) => !state.samplesOfInterestNames.includes(n.name)
        );
        const matchingSampleNames = matchingSamples.map((n: Node) => n.name);

        return {
          ...state,
          // samplesOfInterest: state.samplesOfInterest.concat(matchingSamples),
          samplesOfInterestNames:
            //@ts-ignore
            state.samplesOfInterestNames.concat(matchingSampleNames),
        };
      }
    }

    case "upload submit button clicked": {
      if (state.tree && state.division && state.location) {
        if (state.metadataEntries && state.metadataFieldToMatch && state.tree) {
          const updatedTree = zipMetadataToTree(
            state.tree,
            state.metadataEntries,
            state.metadataFieldToMatch
          );
          return {
            ...state,
            tree: updatedTree,
            loadReport: true,
          };
        } else {
          return {
            ...state,
            loadReport: true,
          };
        }
      }
    }

    default:
      return state;
  }
};
