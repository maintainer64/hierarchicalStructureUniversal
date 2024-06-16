import {v4 as uuidv4} from 'uuid';

const initialStructure = {
    id: uuidv4(),
    name: "Пример компании",
    departments: [
        {
            id: uuidv4(),
            name: "Департамент A",
            departments: [
                {
                    id: uuidv4(),
                    name: "Под-Департамент A1",
                    departments: [],
                    employees: [
                        {
                            id: uuidv4(),
                            name: "Сотрудник A1-1",
                            position: "Менеджер",
                            experience: "3 years"
                        }
                    ]
                }
            ],
            employees: [
                {
                    id: uuidv4(),
                    name: "Сотрудник A-1",
                    position: "Директор",
                    experience: "10 years"
                }
            ]
        },
        {
            id: uuidv4(),
            name: "Департамент B",
            departments: [],
            employees: [
                {
                    id: uuidv4(),
                    name: "Сотрудник B-1",
                    position: "Менеджер",
                    experience: "5 years"
                }
            ]
        }
    ],
    employees: [
        {
            id: uuidv4(),
            name: "CEO",
            position: "Chief Executive Officer",
            experience: "15 years"
        }
    ]
};

export default initialStructure;