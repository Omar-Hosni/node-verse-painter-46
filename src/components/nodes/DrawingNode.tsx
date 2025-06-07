export const DrawingNode = ({ data }) => (
  <div className="w-[200px] h-[150px] bg-black border border-gray-600 relative rounded-md text-white p-2">
    <p>🖍 Drawing Tool (Color: {data.strokeColor})</p>
  </div>
);
