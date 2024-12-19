import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { parseArgs } from "./utils";
import { useExtensionConfig } from "./hooks/useExtensionConfig";

const ITEMS = Array.from(Array(3).keys()).map((key) => {
  return {
    id: key,
    icon: Icon.Bird,
    title: "Title " + key,
    subtitle: "Subtitle",
    accessory: "Accessory",
  };
});

export default function Command() {
  const { config } = useExtensionConfig();

  console.log("config:\n", config);

  const { data, isLoading, error } = usePromise(async () => {
    const args = await parseArgs(config);
    if (!args) return [];
    return args;
  });

  console.log("isLoading:\n", isLoading);
  console.log("error:\n", error);
  console.log("data:\n", data);

  return (
    <List>
      {ITEMS.map((item) => (
        <List.Item
          key={item.id}
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
          accessories={[{ icon: Icon.Text, text: item.accessory }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={item.title} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
