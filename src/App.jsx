import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useEdgesState, useNodesState} from 'reactflow';
import ReactFlow, {Background, Controls, MiniMap} from 'react-flow-renderer';
import dagre from 'dagre';
import {v4 as uuidv4} from 'uuid';
import initialStructure from './initialStructure';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (nodes, edges, direction = "TB") => {
    const isHorizontal = direction === "LR";
    dagreGraph.setGraph({rankdir: direction});

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, {width: nodeWidth, height: nodeHeight});
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? "left" : "top";
        node.sourcePosition = isHorizontal ? "right" : "bottom";
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };
    });

    return {nodes, edges};
};

const restructureTree = (structure) => {
    let nodes = [];
    let edges = [];

    const recursiveBuild = (node, parent = null) => {
        nodes.push({id: node.id, data: {label: node.name, structure: node}, position: {x: 0, y: 0}});

        if (parent) {
            edges.push({id: `e${parent.id}-${node.id}`, source: parent.id, target: node.id});
        }

        node.departments?.forEach(dep => recursiveBuild(dep, node));
        node.employees?.forEach(emp => recursiveBuild(emp, node));
    };

    recursiveBuild(structure);

    return getLayoutedElements(nodes, edges);
};

function App() {
    const [structure, setStructure] = useState(initialStructure);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        const {nodes: layoutedNodes, edges: layoutedEdges} = restructureTree(structure);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    }, [structure]);

    const onNodeClick = useCallback((event, node) => {
        setSelectedItem(node.data.structure);
    }, []);

    const handleAddDepartment = () => {
        const parent = selectedItem;
        if (!parent || !parent.departments) return;

        parent.departments.push({id: uuidv4(), name: `Новый департрамент`, departments: [], employees: []});
        setStructure({...structure});
    };

    const handleAddEmployee = () => {
        const parent = selectedItem;
        if (!parent || !parent.employees) return;

        parent.employees.push({id: uuidv4(), name: `Новый сотрудник`, position: 'Должность', experience: '0 лет'});
        setStructure({...structure});
    };

    const handleSaveFile = () => {
        const fileData = JSON.stringify(structure);
        const blob = new Blob([fileData], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'structure.json';
        link.href = url;
        link.click();
    };

    const handleLoadFile = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const loadedStructure = JSON.parse(e.target.result);
            const ensureIds = (struct) => {
                struct.id = uuidv4();
                struct.departments.forEach(ensureIds);
                struct.employees.forEach(emp => emp.id = uuidv4());
            };
            ensureIds(loadedStructure);
            setStructure(loadedStructure);
        };
        reader.readAsText(file);
    };

    const handleDelete = () => {
        const deleteRecursively = (id, node) => {
            const index = (node.departments || []).findIndex(dept => dept.id === id);
            if (index >= 0) {
                node.departments.splice(index, 1);
                return true;
            }

            for (const dept of node.departments || []) {
                if (deleteRecursively(id, dept)) {
                    return true;
                }
            }

            const empIndex = (node.employees || []).findIndex(emp => emp.id === id);
            if (empIndex >= 0) {
                node.employees.splice(empIndex, 1);
                return true;
            }

            return false;
        };

        deleteRecursively(selectedItem.id, structure);
        setSelectedItem(null);
        setStructure({...structure});
    };

    const handleChange = (e) => {
        const {name, value} = e.target;
        selectedItem[name] = value;
        setStructure({...structure});
    };

    const onLayout = useCallback(
        (direction) => {
            const {nodes: layoutedNodes, edges: layoutedEdges} = getLayoutedElements(nodes, edges, direction);

            setNodes([...layoutedNodes]);
            setEdges([...layoutedEdges]);
        },
        [nodes, edges]
    );

    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        const emptyTerm = term === '' || term === ' ';

        const newNodes = nodes.map(node => ({
            ...node,
            style: {
                ...node.style,
                border: node.data?.structure.name.toLowerCase().includes(term.toLowerCase()) && !emptyTerm ? '2px solid red' : '1px solid #1a192b',
            },
        }));

        setNodes(newNodes);
    };

    return (
        <div className="App flex flex-col items-center p-4">
            <h1 className="text-2xl font-bold flex-grow">{structure.name || "Визуализация компании"}</h1>
            <div className="flex justify-between w-full mb-4">
                <div className="flex space-x-4">
                    <button onClick={handleSaveFile} className="px-4 py-2 bg-blue-500 text-white rounded-md">Save
                    </button>
                    <button onClick={() => fileInputRef.current.click()}
                            className="px-4 py-2 bg-green-500 text-white rounded-md">Load
                    </button>
                    <input ref={fileInputRef} type="file" accept="application/json" onChange={handleLoadFile}
                           className="hidden"/>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="px-3 py-2 border rounded-md"
                    />
                </div>
            </div>
            <div style={{height: 'calc(100vh - 150px)'}} className="flex w-full">
                <div className="flex-grow border p-4 react-flow-wrapper">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={onNodeClick}
                        elementsSelectable={true}
                        nodesDraggable={true}
                        nodesConnectable={true}
                        fitView
                        attributionPosition="top-right"
                    >
                        <MiniMap/>
                        <Controls/>
                        <Background/>
                    </ReactFlow>
                </div>
                <div className="w-1/3 p-4 pt-0 border-l">
                    {selectedItem && (
                        <div className="card bg-white p-4 shadow-md rounded-md">
                            <h3 className="text-lg font-bold mb-4">Карточка</h3>
                            <label className="block mb-2">
                                <span
                                    className="text-sm font-bold">{selectedItem.position ? 'ФИО' : 'Название'}:</span>
                                <input
                                    type="text"
                                    name="name"
                                    value={selectedItem.name || ''}
                                    onChange={handleChange}
                                    className="block w-full px-3 py-2 mt-1 border rounded-md"
                                />
                            </label>
                            {selectedItem.position && (
                                <label className="block mb-2">
                                    <span className="text-sm font-bold">Должность:</span>
                                    <input
                                        type="text"
                                        name="position"
                                        value={selectedItem.position || ''}
                                        onChange={handleChange}
                                        className="block w-full px-3 py-2 mt-1 border rounded-md"
                                    />
                                </label>
                            )}
                            {selectedItem.experience && (
                                <label className="block mb-2">
                                    <span className="text-sm font-bold">Опыт:</span>
                                    <input
                                        type="text"
                                        name="experience"
                                        value={selectedItem.experience || ''}
                                        onChange={handleChange}
                                        className="block w-full px-3 py-2 mt-1 border rounded-md"
                                    />
                                </label>
                            )}
                            <div>
                                {selectedItem.departments && (
                                    <div>
                                        <button onClick={handleAddDepartment}
                                                className="mt-1 px-2 py-1 bg-blue-500 text-white rounded-md text-sm">Добавить
                                            департамент
                                        </button>
                                    </div>
                                )}
                                {selectedItem.employees && (
                                    <div>
                                        <button onClick={handleAddEmployee}
                                                className="mt-1 px-2 py-1 bg-green-500 text-white rounded-md text-sm">Добавить
                                            сотрудника
                                        </button>
                                    </div>
                                )}
                                <div>
                                    <button onClick={handleDelete}
                                            className="mt-1 px-2 py-1 bg-red-500 text-white rounded-md text-sm">Удалить
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;