import * as parser from "../../../src/testthat/parser";
import * as core from "../../../src/testthat/adapter";
import * as vscode from "vscode";
import { Log } from "vscode-test-adapter-util";
import * as path from "path";
import { TestInfo, TestSuiteInfo } from "vscode-test-adapter-api";
import * as chai from "chai";
import * as deepEqualInAnyOrder from "deep-equal-in-any-order";
import * as chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
chai.use(deepEqualInAnyOrder);
const expect = chai.expect;

const testRepoPath = path.join(__dirname, "..", "..", "..", "..", "test", "testRepo");
const testRepoTestsPath = path.join(testRepoPath, "tests", "testthat");

suite("TestthatParser", () => {
    const workspaceFolder = <vscode.WorkspaceFolder>{
        uri: vscode.Uri.file(testRepoPath),
        name: "testRepo",
        index: 0,
    };
    const log = new Log("RExplorer", workspaceFolder, "R Explorer Log");

    test("Tests are parsed from file", async () => {
        let testAdapter = new core.TestthatAdapter(workspaceFolder, log);

        let suite = await parser.parseTestsFromFile(
            testAdapter,
            vscode.Uri.file(path.join(testRepoTestsPath, "test-email.R"))
        );

        expect(suite).to.be.deep.equalInAnyOrder(testEmailRepoStructure);
        testAdapter.dispose();
    });

    test("tree-sitter parser executes correctly", async () => {
        let matches = await parser._unittestable.findTests(
            vscode.Uri.file(path.join(testRepoTestsPath, "test-email.R"))
        );

        expect(formatMatches(matches)).to.be.deep.equalInAnyOrder([
            {
                pattern: 0,
                captures: [
                    {
                        name: "call",
                        text:
                            'test_that("Email address works", {' +
                            "\n" +
                            '  skip("Skip for test reasons")' +
                            "\n" +
                            '  mockery::stub(email_address, "system", "jambajoe@joe.joe")' +
                            "\n" +
                            '  expect_equal(email_address(), "jambajoe@joe.joe")' +
                            "\n" +
                            "})",
                    },
                    { name: "_function.name", text: "test_that" },
                    { name: "label", text: '"Email address works"' },
                ],
            },
            {
                pattern: 0,
                captures: [
                    {
                        name: "call",
                        text:
                            'test_that("EMAIL env var", {' +
                            "\n" +
                            "  expect_equal(" +
                            "\n" +
                            '    withr::with_envvar(c("EMAIL" = "bugs.bunny@acme.com"), email_address()),' +
                            "\n" +
                            '    "bugs.bunny@acme.com")' +
                            "\n" +
                            "})",
                    },
                    { name: "_function.name", text: "test_that" },
                    { name: "label", text: '"EMAIL env var"' },
                ],
            },
        ]);
    });

    test("Node id's are properly encoded", async () => {
        let encoded_id = parser.encodeNodeId("test1", "test2");
        expect(encoded_id).to.be.equal("test1&test2");
    });
});

function formatMatches(matches: any) {
    return matches.map(({ pattern, captures }: any) => ({
        pattern,
        captures: formatCaptures(captures),
    }));
}

function formatCaptures(captures: any) {
    return captures.map((c: any) => {
        const node = c.node;
        delete c.node;
        c.text = node.text;
        return c;
    });
}

const testEmailRepoStructure: TestSuiteInfo = {
    type: "suite",
    id: "test-email.R",
    label: "test-email.R",
    file: path.join(testRepoTestsPath, "test-email.R"),
    children: [
        <TestInfo>{
            type: "test",
            id: "test-email.R&Email address works",
            label: "Email address works",
            file: path.join(testRepoTestsPath, "test-email.R"),
            line: 3,
        },
        <TestInfo>{
            type: "test",
            id: "test-email.R&EMAIL env var",
            label: "EMAIL env var",
            file: path.join(testRepoTestsPath, "test-email.R"),
            line: 9,
        },
    ],
};
