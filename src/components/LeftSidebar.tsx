import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useReactFlow } from "@xyflow/react";
import {
  Cpu,
  Layers,
  Image as ImageIcon,
  Type,
  FileOutput,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  LayoutList,
  SquarePlus,
  FileImage,
  Shuffle,
  Search,
  PlusCircle,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NodeType, NodeOption } from "@/store/types";
import { getHighestOrder } from "@/store/nodeActions";
import { insertCategories, assetCategories } from "./nodes/data/left_sidebar";
import { LayerPanel } from "./LayerPanel";
import SvgIcon from "./SvgIcon";
import { TextInput } from "./PropertyComponents";

// ToggleButton component - same as RightSidebar
const ToggleButton = React.memo(
  ({
    options,
    value,
    onChange,
  }: {
    options: { label: string | React.ReactNode; value: string }[];
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div
      className="flex bg-[#1a1a1a] rounded-full w-full p-0.5"
      style={{ minHeight: "30px", height: "30px" }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 h-full text-sm transition-all flex items-center justify-center rounded-full ${
            value === option.value
              ? "bg-[#333333] text-white"
              : "text-[#9e9e9e] hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
);

export const LeftSidebar = ({
  activeTab,
  setActiveTab,
  setSelectedInsertNode,
}: {
  activeTab: "Outline" | "Insert" | "Assets";
  setActiveTab: (tab: "Outline" | "Insert" | "Assets") => void;
  setSelectedInsertNode: (insertNode) => void;
}) => {
  const addNode = useCanvasStore((state) => state.addNode);
  const reactFlowInstance = useReactFlow();
  const { getNodes } = useReactFlow();

  const [searchTerm, setSearchTerm] = useState("");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    {
      Inputs: true,
      Models: true,
      LoRAs: false,
      ControlNets: true,
      Output: true,
      Components: true,
      Renders: false,
      Uploaded: true,
      Generated: true,
    }
  );

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Filter nodes based on search term
  const filterNodeOptions = (options: NodeOption[]) => {
    if (!searchTerm) return options;

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Create a flat list of all options for search
  const allNodeOptions = insertCategories.flatMap(
    (category) => category.options
  );

  // Handler for adding a node
  const handleAddNode = (nodeType: NodeType) => {
    // Get the center of the viewport

    console.log(nodeType);
    const center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    // Convert screen coordinates to flow coordinates
    const position = reactFlowInstance.screenToFlowPosition({
      x: center.x,
      y: center.y,
    });

    const order = getHighestOrder(getNodes()) + 1;
    addNode(nodeType, position, order);
  };

  return (
    <div className="w-[265px] h-full bg-[#0d0d0d] border-r border-[#1d1d1d] flex flex-col overflow-hidden">
      {/* Fixed tab selector at the top */}
      <div style={{ padding: "16px", paddingBottom: "0px" }}>
        <div className="mb-4">
          <ToggleButton
            options={[
              { label: "Outline", value: "Outline" },
              { label: "Insert", value: "Insert" },
              { label: "Assets", value: "Assets" },
            ]}
            value={activeTab}
            onChange={(value) =>
              setActiveTab(value as "Outline" | "Insert" | "Assets")
            }
          />
        </div>
      </div>

      {/* Divider line */}
      <div
        style={{
          width: "233px",
          height: "1px",
          backgroundColor: "#1d1d1d",
          marginLeft: "16px",
          marginBottom: "6px",
        }}
      ></div>

      {/* Scrollable content area */}
      <ScrollArea className="h-[calc(100vh-80px-40px-1px)] overflow-y-auto">
        <div
          style={{
            paddingLeft: "16px",
            paddingRight: "16px",
            paddingTop: "0px",
            paddingBottom: "0px",
          }}
        >
          {/* Outline Tab - New Layer Panel */}
          {activeTab === "Outline" && (
            <div style={{ paddingTop: "6px" }}>
              <LayerPanel />
            </div>
          )}

          {/* Insert Tab - Node Categories */}
          {activeTab === "Insert" && (
            <div>
              {/* Search bar with dividers */}
              <div style={{ paddingTop: "6px", paddingBottom: "12px" }}>
                <div className="relative h-[30px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#9e9e9e] z-10 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search nodes..."
                    className="w-full h-full bg-[#1a1a1a] rounded-full pl-10 pr-3 py-1.5 text-sm text-white placeholder-[#9e9e9e] outline-none"
                  />
                </div>
              </div>
              <div
                className="border-t border-[#1d1d1d]"
                style={{ paddingTop: "16px" }}
              >
                {searchTerm ? (
                  // Show filtered results when searching
                  <div className="mb-8">
                    <div className="flex flex-row items-center mb-3 ml-4">
                      <div className="text-sm font-semibold mr-2 bg-[#2b2b2b] p-1 rounded-md">
                        <Search className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-sm font-semibold text-[#9e9e9e]">
                        <span>Search Results</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {allNodeOptions
                        .filter(
                          (option) =>
                            option.label
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()) ||
                            option.description
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase())
                        )
                        .map((option) => (
                          <div
                            key={option.type}
                            onClick={() => {
                              if (option.status !== "coming-soon") {
                                setSelectedInsertNode(option);
                              }
                            }}
                            className={`relative bg-[#151515] border border-transparent hover:border-[#007AFF] rounded-2xl 
                                    px-8 py-6 flex items-center justify-center cursor-pointer 
                                    overflow-hidden ${
                                      option?.image_url ? "p-0" : "flex-col"
                                    } 
                                    ${
                                      option.status === "coming-soon"
                                        ? "opacity-50 cursor-not-allowed"
                                        : ""
                                    }`}
                          >
                            {/* Image or icon + label */}
                            {option?.image_url ? (
                              <img
                                src={option.image_url}
                                alt={option.label}
                                className="scale-[220%] rounded-2xl"
                              />
                            ) : (
                              <>
                                <SvgIcon
                                  name={option.icon.toString()}
                                  className="h-8 w-8 text-[#f3f2f2] mb-2"
                                />
                                <span className="text-sm text-[#9e9e9e] whitespace-nowrap overflow-hidden text-ellipsis py-2">
                                  {option.label}
                                </span>
                              </>
                            )}

                            {/* Overlay for "Coming Soon" */}
                            {option.status === "coming-soon" && (
                              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-2xl">
                                <span className="text-white text-xs font-semibold">
                                  Coming Soon
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                    {allNodeOptions.filter(
                      (option) =>
                        option.label
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()) ||
                        option.description
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                    ).length === 0 && (
                      <div className="text-center text-[#9e9e9e] py-8">
                        No nodes found matching "{searchTerm}"
                      </div>
                    )}
                  </div>
                ) : (
                  // Show categories when not searching
                  insertCategories.map((category) => (
                    <div key={category.name} className="mb-8">
                      <div className="flex flex-row items-center mb-3 ml-4">
                        <div className="text-sm font-semibold mr-2 bg-[#2b2b2b] p-1 rounded-md">
                          <category.icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-sm font-semibold text-[#9e9e9e]">
                          <span>{category.name}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {category.options.map((option) => (
                          <div
                            key={option.type}
                            // onClick={
                            //   option.status === 'coming-soon'
                            //     ? undefined
                            //     : () => handleAddNode(option.type)
                            // }
                            onClick={() => {
                              if (option.status !== "coming-soon") {
                                setSelectedInsertNode(option);
                              }
                            }}
                            className={`relative bg-[#151515] border border-transparent hover:border-[#007AFF] rounded-2xl 
                                px-8 py-6 flex items-center justify-center cursor-pointer 
                                overflow-hidden ${
                                  option?.image_url ? "p-0" : "flex-col"
                                } 
                                ${
                                  option.status === "coming-soon"
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                          >
                            {/* Image or icon + label */}
                            {option?.image_url ? (
                              <img
                                src={option.image_url}
                                alt={option.label}
                                className="scale-[220%] rounded-2xl"
                              />
                            ) : (
                              <>
                                <SvgIcon
                                  name={option?.icon}
                                  className="h-8 w-8 text-[#f3f2f2] mb-2"
                                />
                                <span className="text-sm text-[#9e9e9e] whitespace-nowrap overflow-hidden text-ellipsis py-2">
                                  {option.label}
                                </span>
                              </>
                            )}

                            {/* Overlay for "Coming Soon" */}
                            {option.status === "coming-soon" && (
                              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-2xl">
                                <span className="text-white text-xs font-semibold">
                                  Coming Soon
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Assets Tab - Images and Components */}
          {activeTab === "Assets" && (
            <div className="space-y-6 mt-2">
              {/* Uploaded Images Section */}
              <div>
                <Collapsible
                  open={openCategories["Uploaded"]}
                  onOpenChange={() => toggleCategory("Uploaded")}
                >
                  <CollapsibleTrigger className="flex items-center w-full text-left mb-3">
                    <div className="flex items-center gap-2 text-gray-300">
                      <span className="text-blue-400">
                        {openCategories["Uploaded"] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                      <FileImage className="h-4 w-4" />
                      <span className="font-medium">Uploaded Images</span>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Placeholder for uploaded images - will be populated from store/API */}
                      <div className="aspect-square bg-[#1a1a1a] border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-500 text-xs cursor-pointer hover:border-gray-500 transition-colors">
                        <div className="text-center">
                          <PlusCircle className="h-6 w-6 mx-auto mb-1" />
                          <span>Upload</span>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Generated Images Section */}
              <div>
                <Collapsible
                  open={openCategories["Generated"]}
                  onOpenChange={() => toggleCategory("Generated")}
                >
                  <CollapsibleTrigger className="flex items-center w-full text-left mb-3">
                    <div className="flex items-center gap-2 text-gray-300">
                      <span className="text-blue-400">
                        {openCategories["Generated"] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                      <Shuffle className="h-4 w-4" />
                      <span className="font-medium">Generated Images</span>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Placeholder for generated images - will be populated from store/API */}
                      <div className="aspect-square bg-[#1a1a1a] border border-gray-700 rounded-lg flex items-center justify-center text-gray-500 text-xs">
                        <span>No images yet</span>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Components Section */}
              {assetCategories.map((category) => (
                category.name === "Components" && (
                  <div key={category.name}>
                    <Collapsible
                      open={openCategories[category.name]}
                      onOpenChange={() => toggleCategory(category.name)}
                    >
                      <CollapsibleTrigger className="flex items-center w-full text-left mb-3">
                        <div className="flex items-center gap-2 text-gray-300">
                          <span className="text-blue-400">
                            {openCategories[category.name] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                          <category.icon className="h-4 w-4" />
                          <span className="font-medium">{category.name}</span>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="pl-2 space-y-2">
                        {category.items.map((item, index) => (
                          <div key={index}>
                            {item.type === "component" ? (
                              <div 
                                className="flex items-center p-2 hover:bg-gray-700 rounded-md cursor-pointer transition-colors"
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('application/component', JSON.stringify(item));
                                }}
                              >
                                <div className="w-4 h-4 bg-purple-500 rounded-sm mr-2"></div>
                                <span className="text-sm text-gray-300">
                                  {item.name}
                                </span>
                              </div>
                            ) : (
                              <div className="mb-2">
                                {item.image && (
                                  <div 
                                    className="relative group cursor-pointer"
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('application/image', JSON.stringify(item));
                                    }}
                                  >
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-full h-20 object-cover rounded-lg hover:opacity-90 transition-opacity"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                      <span className="text-white text-xs opacity-0 group-hover:opacity-100">
                                        Drag to canvas
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
