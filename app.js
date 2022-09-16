const chokidar = require("chokidar");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
// const jsonFile = require(path.join(process.cwd(), "classes.json"));

module.exports = ({ dir, type, output }) => {
    dir.forEach((v) => {
        const validPath = path.join(process.cwd(), v);
        if (!fs.existsSync(validPath)) return;

        chokidar.watch(validPath).on("change", (filePath, stats) => {
            if (!type.includes(path.extname(filePath))) return;
            getDataFromFile(filePath);
        });
    });

    function getDataFromFile(path) {
        const fileData = fs.readFileSync(path, { encoding: "utf8" });

        let classArr = fileData.match(/className=\".*"/g);
        let newFileData = fileData;
        if (classArr) {
            classArr.forEach((classLine) => {
                newFileData = newFileData.replace(
                    classLine,
                    classConvert(classLine)
                );
            });
        }
        if (fileData != newFileData) {
            fs.writeFileSync(path, newFileData, { encoding: "utf8" });
        }
    }

    function classConvert(classLine) {
        const classListArr = classLine
            .slice(11, -1)
            .split(" ")
            .filter((v) => v != "");

        let findClassName = classListArr.find((v) => v.startsWith("_"));
        const filterClassArr = classListArr.filter((v) => !v.startsWith("_"));

        if (!findClassName) return classLine;

        if (findClassName.endsWith("_")) {
            if (classListArr.length == 1) return classLine;

            readWriteJsonFile((jsonObj) => {
                jsonObj[findClassName] =
                    jsonObj[findClassName] + " " + filterClassArr.join(" ");
                return jsonObj;
            });
            return `className="${findClassName}"`;
        }

        if (findClassName.length > 1) {
            findClassName =
                findClassName +
                "-" +
                crypto.randomBytes(1).toString("hex") +
                "_";
        } else {
            findClassName =
                findClassName +
                "-" +
                crypto.randomBytes(5).toString("hex") +
                "_";
        }

        readWriteJsonFile((jsonObj) => {
            jsonObj[findClassName] = filterClassArr.join(" ");
            return jsonObj;
        });

        return `className="${findClassName}"`;
    }

    function readWriteJsonFile(callback) {
        const jsonFilePath = path.join(process.cwd(), "classes.json");
        let jsonData = fs.readFileSync(jsonFilePath, { encoding: "utf8" });

        let jsonObj = {};
        if (jsonData) {
            jsonObj = JSON.parse(jsonData);
        }
        jsonObj = callback(jsonObj);
        objToOutput(jsonObj);
        fs.writeFileSync(jsonFilePath, JSON.stringify(jsonObj), {
            encoding: "utf8",
            flag: "w",
        });
    }

    function objToOutput(jsonObj) {
        const outputPath = path.join(process.cwd(), output);
        let classStr = "";
        for (const [key, value] of Object.entries(jsonObj)) {
            classStr += `.${key}{@apply ${value}}`;
        }
        fs.writeFileSync(outputPath, classStr, { flag: "w" });
    }
};
